export function Page() {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No results"
      error={error}
      loading={isLoading}
      onFilter={handleFilter}
      onPaginate={handlePaginate}
      onSort={handleSort}
    />
  )
}
