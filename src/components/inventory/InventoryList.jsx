import { formatCustomDate } from '../../utils/dateUtils';
import { getActivePoolItems } from '../../utils/inventoryUtils';
import DataTable from '../common/tables/DataTable';
import StatusChip from '../common/StatusChip';
import ConditionChip from '../common/ConditionChip';
import WarningIcon from '@mui/icons-material/Warning';

function InventoryList({
  data,
  onSelect,
  onSelectPoolItem,
  pagination,
  onPageChange,
  onRowsPerPageChange,
}) {
  const renderPoolItemId = (_, row) => {
    const activePoolItems = getActivePoolItems(row);

    if (activePoolItems.length === 0) {
      return '--';
    }

    if (activePoolItems.length === 1) {
      return activePoolItems[0].id;
    }

    // Multiple ACTIVE pool items: show warning emoji with tooltip
    const poolItemIds = activePoolItems.map((item) => item.id).join(', ');
    const tooltipMsg = `cannot display pool item id because more than 1 pool item [${poolItemIds}] is ACTIVE for this inventory item id: ${row.id}`;

    return (
      <span title={tooltipMsg}>
        <WarningIcon
          sx={{
            color: '#FFC107',
            fontSize: '1.2rem',
            cursor: 'pointer',
          }}
        />
      </span>
    );
  };

  const columns = [
    { field: 'id', headerName: 'Item ID', type: 'smallNumber' },
    {
      field: 'poolItemIdDisplay',
      headerName: 'Pool Item ID',
      type: 'smallNumber',
      stopPropagation: true,
      render: renderPoolItemId,
      onClick: (_, row) => {
        const activePoolItems = getActivePoolItems(row);
        if (activePoolItems.length === 1) {
          onSelectPoolItem?.({ ...row, selectedPoolItemId: activePoolItems[0].id });
        }
      },
      cellSx: (theme) => {
        return {
          color: theme.palette.primary.main,
          textDecoration: 'underline',
          cursor: 'pointer',
        };
      },
    },
    { field: 'productName', headerName: 'Product Name', type: 'mediumText' },
    { field: 'warehouseName', headerName: 'Warehouse', type: 'mediumText' },
    {
      field: 'locationReferenceType',
      headerName: 'Location Type',
      type: 'smallText',
    },
    {
      field: 'condition',
      headerName: 'Condition',
      type: 'smallText',
      render: (_, row) => {
        const activePoolItems = getActivePoolItems(row);

        if (activePoolItems.length !== 1) {
          return '--';
        }

        const condition = activePoolItems[0].condition;

        if (!condition) {
          return '--';
        }

        return <ConditionChip condition={condition} />;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'smallText',
      width: 90,
      render: (value) => <StatusChip status={value} />,
    },
    {
      field: 'manufacturedDate',
      headerName: 'Manuf. Date',
      type: 'mediumText',
      width: 90,
      render: (value) => formatCustomDate(value),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data}
      onRowClick={onSelect}
      pagination={pagination}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
    />
  );
}

export default InventoryList;
