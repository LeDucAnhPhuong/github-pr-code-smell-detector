export function ManyInline() {
  return (
    <Form
      onBlur={() => console.log('blur')}
      onChange={() => console.log('change')}
      onFocus={() => console.log('focus')}
      onReset={() => console.log('reset')}
      onSubmit={() => console.log('submit')}
    />
  )
}
