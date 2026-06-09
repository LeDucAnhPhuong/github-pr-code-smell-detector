import { useState } from 'react'

export function ManyStates() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(0)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [data, setData] = useState<unknown[]>([])
  return <div>{name}</div>
}
