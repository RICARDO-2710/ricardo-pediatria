import type { AppProps } from 'next/app';
import '../styles/globals.css'; // Mantenha seus estilos globais

function MyApp({ Component, pageProps }: AppProps) {
  // Remova qualquer <ChakraProvider> ou <PlasmicRootProvider> daqui
  return <Component {...pageProps} />;
}

export default MyApp;