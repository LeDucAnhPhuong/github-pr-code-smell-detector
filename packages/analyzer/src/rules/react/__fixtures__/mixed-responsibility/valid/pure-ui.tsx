export function PureUI({ data }: { data: string[] }) {
  return (
    <ul>
      {data.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
