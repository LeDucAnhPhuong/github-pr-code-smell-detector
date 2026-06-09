import { useState } from 'react'

export function FewStates() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(0)
  const [active, setActive] = useState(false)
  return <div>{name}</div>
}
