export function getEnvValue(name: string): string {
  const runtimeValue = process.env[name]
  return typeof runtimeValue === 'string' ? runtimeValue : ''
}
