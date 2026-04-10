export function App() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--color-neutral-50)',
        fontFamily: 'var(--font-family-ui)',
        color: 'var(--color-neutral-800)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-primary-500)',
            marginBottom: 'var(--space-4)',
          }}
        >
          NodePress Admin
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-neutral-500)',
          }}
        >
          CMS moderno. Sin legado.
        </p>
      </div>
    </div>
  );
}
