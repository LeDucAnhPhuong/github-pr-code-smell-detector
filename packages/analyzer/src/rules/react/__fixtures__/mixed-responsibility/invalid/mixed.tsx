import { useEffect, useState } from 'react'

export function MixedComponent() {
  const [data, setData] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((d) => setData(d))
  }, [])

  return (
    <ul>
      {data.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
