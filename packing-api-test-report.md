# Packing Jobs API Test Report

Generated: 2026-05-22

## Summary

The frontend integration was checked against the configured API base URL from `.env`:

```text
VITE_BASE_URL=http://localhost:8080/api
```

Initial non-escalated CLI tests could not reach `localhost:8080` because of sandboxed network access. With localhost access allowed, the backend responded and confirmed that unauthenticated requests are rejected with `401`.

The previous frontend integration incorrectly used `GET /packing/jobs` for list fetching. The backend controller and API contract do not support that collection route. The frontend was corrected to use the supported fetch endpoint: `GET /packing/sources/{referenceType}/{referenceId}`.

## Tested Endpoints

| Feature | Method | Endpoint | Result |
| --- | --- | --- | --- |
| Feature | Method | Endpoint | Result |
| --- | --- | --- | --- |
| Fetch packing job by source | `GET` | `/api/packing/sources/{referenceType}/{referenceId}` | Integrated in frontend; CLI needs valid auth/source id for success test |
| Fetch packing job details | `GET` | `/api/packing/jobs/{jobId}` | Integrated in frontend; CLI needs valid auth/job id for success test |
| Edit packing job | `PUT` | `/api/packing/jobs/{jobId}/product-items` | Integrated in frontend; CLI needs valid auth/job id and editable job |
| Assign packer | `POST` | `/api/packing/jobs/{jobId}/assignments` | Integrated in frontend; CLI needs valid auth/job id/user id |

## Commands Run

```bash
curl -i --max-time 10 http://localhost:8080/api/packing/jobs
```

Result:

```text
HTTP 401
{"status":401,"message":"Authorization token is required."}
```

This endpoint is not supported as a collection fetch even with auth; the backend reports `Request method 'GET' not supported` for `GET /api/packing/jobs?dcId=100000`.

```bash
curl -i --max-time 10 -X PUT http://localhost:8080/api/packing/jobs/1/product-items \
  -H 'Content-Type: application/json' \
  -d '{"productItems":[]}'
```

```bash
curl -i --max-time 10 -X POST http://localhost:8080/api/packing/jobs/1/assignments \
  -H 'Content-Type: application/json' \
  -d '{"userId":1,"allocationLevelType":"JOB","notes":"API smoke test"}'
```

## Error Observed

```text
HTTP 401
{"status":401,"message":"Authorization token is required."}
```

## Frontend Integration Status

Implemented service methods:

- `packingJobService.getJobBySource(referenceType, referenceId)` -> `GET /packing/sources/{referenceType}/{referenceId}`
- `packingJobService.getJob(jobId)` -> `GET /packing/jobs/{jobId}`
- `packingJobService.replaceProductItems(jobId, payload)` -> `PUT /packing/jobs/{jobId}/product-items`
- `packingJobService.assignPacker(jobId, payload)` -> `POST /packing/jobs/{jobId}/assignments`
- `packingJobService.getAssignments(jobId)` -> `GET /packing/jobs/{jobId}/assignments`

The frontend route builds successfully, and targeted ESLint passed for the packing module. Runtime success validation remains blocked from CLI until a valid bearer token, company id, warehouse/dc id, source id, job id, and packer user id are provided.

## Next Verification Steps

1. Log in through the UI so requests include a valid bearer token and `X-Company-ID`.
2. Select a warehouse/DC so `dcId` is injected where required.
3. Fetch by source using a real `referenceType` and `referenceId`, for example `ORDER_FULFILLMENT` and a fulfillment id.
4. Re-run edit/assign with a real pending packing job id and active packer user id.
