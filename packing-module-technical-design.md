# Packing Module Technical Design

Status: Draft  
Last updated: 2026-05-21  
System: flash-admin backend

## 1. Overview

The packing module tracks order/source packing from planning to execution.

Workflow:

1. Delivery `OrderFulfillment` creation automatically creates a `PackingJob`.
2. System creates default `PackingJobProductItem` rows from order delivery items.
3. User edits planned allocations if the default product/pool/quantity plan needs changes.
4. User assigns the whole job to one packer, or assigns lists of product items to packers.
5. Packer submits `PackingSession` with `PackingSessionItem.actualAllocations`.
6. System recalculates product item and job status from planned vs actual allocations.

The model supports packing one product from multiple pools. Example: if 10 bedsheets are needed, planned allocations can say 8 from pool A and 2 from pool B.

The new model does not keep legacy fields such as `legacyOrderId`, `legacyFulfillmentId`, `legacyFulfillmentPackingItemId`, `sourceItemId`, or `sourceItemType`.

## 2. Core Entities

| Entity | Purpose | Important Fields |
| --- | --- | --- |
| `PackingJob` | Top-level packing work for one source | - `id`<br>- `jobNumber`<br>- `referenceType` enum<br>- `referenceId` string<br>- `status` enum<br>- `startedAt` instant<br>- `completedAt` instant<br>- `expiredAt` instant<br>- `notes` varchar(500) |
| `PackingJobProductItem` | One source product row inside a job | - `id`<br>- `packingJob`<br>- `referenceItemType` enum<br>- `referenceItemId` string<br>- `plannedAllocations` json<br>- `status` enum<br>- `notes` varchar(500) |
| `PackingAssignment` | Packer assignment for a whole job or list of product items | - `id`<br>- `packingJob`<br>- `allocationLevelType` enum<br>- `packingJobProductItems` list<br>- `user`<br>- `status` enum<br>- `assignedAt` instant<br>- `unassignedAt` instant<br>- `notes` varchar(500) |
| `PackingSession` | One packing execution event | - `id`<br>- `packingAssignment` required<br>- `packedBy`<br>- `packingSessionItems`<br>- `status` enum<br>- `packedAt` instant<br>- `notes` varchar(500) |
| `PackingSessionItem` | One item entry inside a session | - `id`<br>- `packingSession`<br>- `actualAllocations` json<br>- `notes` varchar(500) |

## 3. Allocation JSON

`PackingJobProductItem.plannedAllocations` is the packing instruction.

```json
[
  { "productId": 101, "poolId": 103001, "packingQuantity": 8 },
  { "productId": 101, "poolId": 103002, "packingQuantity": 2 }
]
```

`PackingSessionItem.actualAllocations` is what the packer actually packed.

```json
[
  {
    "productId": 101,
    "poolId": 103001,
    "packedQuantity": 8,
    "inventoryItemIds": [8001, 8002, 8003]
  },
  {
    "productId": 101,
    "poolId": 103002,
    "packedQuantity": 2,
    "inventoryItemIds": [8010, 8011]
  }
]
```

Rules:

- `PackingJobProductItem` does not store direct `product`, `requiredQuantity`, or `packedQuantity`.
- `PackingSessionItem` does not store direct `quantity`, `inventoryPoolId`, `inventoryItems`, or `packingJobProductItem`.
- Planned quantity is `plannedAllocations[].packingQuantity`.
- Actual quantity is `actualAllocations[].packedQuantity`.
- A product/pool pair must be unique inside a job because actual allocations resolve by product and pool.

## 4. Assignment Rules

`PackingAssignment` is mandatory for every `PackingSession`.

| Allocation Level | Product Items | Meaning |
| --- | --- | --- |
| `JOB` | empty list | one packer owns the whole job |
| `PRODUCT_ITEM` | one or more items | packer owns only those product items |

Rules:

- A job can have one active `JOB` assignment, or multiple active `PRODUCT_ITEM` assignments, never both.
- A `JOB` assignment is exclusive and cannot be shared with other packers.
- A `PRODUCT_ITEM` assignment can include multiple product items.
- The same product item can have only one active assignment.
- One packer can pack multiple jobs by receiving multiple assignments.
- Assignment status must be `ASSIGNED` or `IN_PROGRESS` before packing.
- The assignment user must match `packedByUserId`.

## 5. Services

| Service | Responsibility |
| --- | --- |
| `PackingJobService` | auto-create job from order fulfillment, add/replace product items, create job with items |
| `PackingAssignmentService` | create/unassign assignments and enforce assignment exclusivity |
| `PackingSessionService` | create sessions, validate actual allocations, recalculate statuses |
| `PackingAggregateService` | build read model for APIs and downstream consumers |

`PackingAggregateService` is intentionally a read-model service. It builds one normalized response from jobs, product items, sessions, and allocation JSON so downstream modules do not read packing tables directly.

## 6. API Shape

| Endpoint | Purpose |
| --- | --- |
| `POST /api/packing/jobs` | create or open a packing job header |
| `POST /api/packing/jobs/{jobId}/product-items` | add planned product items to a job |
| `PUT /api/packing/jobs/{jobId}/product-items` | replace planned product items before assignment |
| `POST /api/packing/jobs/with-items` | create job and planned product items in one request |
| `GET /api/packing/jobs/{jobId}` | get job aggregate |
| `POST /api/packing/jobs/{jobId}/assignments` | assign packer |
| `GET /api/packing/jobs/{jobId}/assignments` | list job assignments |
| `PATCH /api/packing/assignments/{assignmentId}/unassign` | unassign packer |
| `POST /api/packing/jobs/{jobId}/sessions` | create packing session |
| `GET /api/packing/jobs/{jobId}/sessions` | list job sessions |
| `GET /api/packing/assignments/{assignmentId}/sessions` | list assignment sessions |
| `GET /api/packing/sources/{referenceType}/{referenceId}` | get job aggregate by source |

Create job:

```json
{
  "referenceType": "ORDER_FULFILLMENT",
  "referenceId": "120001",
  "notes": "Urgent dispatch"
}
```

Normal order fulfillment flow does not require this request. `PackingJob` is auto-created when delivery `OrderFulfillment` is created.

Create product items:

```json
{
  "productItems": [
    {
      "referenceItemType": "LEASING_ORDER_DELIVERY_ITEM",
      "referenceItemId": "45001",
      "plannedAllocations": [
        { "productId": 101, "poolId": 103001, "packingQuantity": 8 },
        { "productId": 101, "poolId": 103002, "packingQuantity": 2 }
      ],
      "notes": "Bedsheets"
    }
  ]
}
```

Create job with items:

```json
{
  "packingJob": {
    "referenceType": "ORDER_FULFILLMENT",
    "referenceId": "120001"
  },
  "productItems": [
    {
      "referenceItemType": "LEASING_ORDER_DELIVERY_ITEM",
      "referenceItemId": "45001",
      "plannedAllocations": [
        { "productId": 101, "poolId": 103001, "packingQuantity": 8 }
      ]
    }
  ]
}
```

Product-item assignment:

```json
{
  "userId": 501,
  "allocationLevelType": "PRODUCT_ITEM",
  "packingJobProductItemIds": [90021, 90022],
  "notes": "Assign bedsheets and towels"
}
```

Whole-job assignment:

```json
{
  "userId": 501,
  "allocationLevelType": "JOB",
  "notes": "Assign whole job"
}
```

Create session:

```json
{
  "packingAssignmentId": 71001,
  "packedByUserId": 501,
  "packingSessionItems": [
    {
      "actualAllocations": [
        {
          "productId": 101,
          "poolId": 103001,
          "packedQuantity": 8,
          "inventoryItemIds": [8001, 8002, 8003]
        }
      ]
    }
  ],
  "packedAt": "2026-05-20T10:30:00Z",
  "notes": "Packed by barcode scan"
}
```

## 7. Validation And Status

Job planning:

- Auto-created order fulfillment jobs use `PackingJobReferenceType.ORDER_FULFILLMENT` and fulfillment id as string `referenceId`.
- Auto-created planned quantities come from leasing order delivery items: `quantity - completedQuantity - rejectedQuantity`.
- Auto-created planned pool comes from the order customer active `InventoryReservation.inventoryPool`.
- Product items can be added only while job is `PENDING`.
- Product items can be replaced only while job is `PENDING`.
- Product items cannot be added or replaced after active assignments or sessions exist.
- Planned allocation product, pool, and quantity are required.
- Planned allocation quantity must be greater than zero.
- Duplicate planned product/pool pairs are not allowed in one job.

Session creation:

- Job must be packable.
- Assignment must be active and belong to the job.
- Assignment must belong to the packer.
- Actual allocation product/pool must be planned inside the assignment scope.
- Packed quantity including existing sessions cannot exceed planned quantity.
- Tagged products require one inventory item id per packed unit.
- Inventory items must be active, fresh in pool, and in the expected warehouse/DC.

Status calculation:

- Product item is `PENDING` when packed quantity is zero.
- Product item is `PARTIALLY_PACKED` when packed quantity is greater than zero and less than planned quantity.
- Product item is `PACKED` when packed quantity equals planned quantity.
- Job is `PACKED` when all product items are packed.
- Job is `PARTIALLY_PACKED` when at least one product item is packed and not all are packed.

## 8. Database Design

| Table | Purpose | Important Columns |
| --- | --- | --- |
| `packing_jobs` | stores packing jobs | - `id`<br>- `job_number`<br>- `reference_type`<br>- `reference_id`<br>- `status`<br>- `started_at`<br>- `completed_at`<br>- `expired_at`<br>- `notes` |
| `packing_job_product_items` | stores source product rows | - `id`<br>- `packing_job_id`<br>- `reference_item_type`<br>- `reference_item_id`<br>- `planned_allocations` json<br>- `status`<br>- `notes` |
| `packing_assignments` | stores packer assignment headers | - `id`<br>- `packing_job_id`<br>- `allocation_level_type`<br>- `user_id`<br>- `status`<br>- `assigned_at`<br>- `unassigned_at`<br>- `notes` |
| `packing_assignment_product_items` | stores product items owned by a product-level assignment | - `packing_assignment_id`<br>- `packing_job_product_item_id` |
| `packing_sessions` | stores execution headers | - `id`<br>- `packing_assignment_id`<br>- `packed_by_user_id`<br>- `status`<br>- `packed_at`<br>- `notes` |
| `packing_session_items` | stores actual packed entries | - `id`<br>- `packing_session_id`<br>- `actual_allocations` json<br>- `notes` |

## 9. Migration From Existing Fulfillment Packing

Migration logic is not part of the first implementation. When needed, migrate directly from old tables into new tables with a controlled database script or one-time job.

Old data maps into new data without legacy columns:

| Old Data | New Data |
| --- | --- |
| `FulfillmentPacking.fulfillment.id` | `PackingJob.referenceId` as string |
| `ORDER_FULFILLMENT` | `PackingJob.referenceType` |
| `FulfillmentPacking.status` | `PackingJob.status` |
| `FulfillmentPacking.packedAt` | `PackingJob.completedAt`, `PackingSession.packedAt` |
| `FulfillmentPackingItem.orderItemId` | `PackingJobProductItem.referenceItemId` as string |
| `FulfillmentPackingItem.product` | `plannedAllocations[].productId` |
| source/reserved pool | `plannedAllocations[].poolId` |
| `FulfillmentPackingItem.quantity` | `plannedAllocations[].packingQuantity`, `actualAllocations[].packedQuantity` |
| `FulfillmentPackingItem.inventoryItems` | `actualAllocations[].inventoryItemIds` |

Migration should verify row counts, quantity totals, and inventory item links before switching reads/writes.

## 10. Summary

The module keeps planning and execution separate.

- Planning truth lives in `PackingJobProductItem.plannedAllocations`.
- Execution truth lives in `PackingSessionItem.actualAllocations`.
- Assignment controls who can pack which planned allocations.
- Whole-job assignment is exclusive.
- Product-item assignment allows the job to be split across packers without sharing the same product item.
