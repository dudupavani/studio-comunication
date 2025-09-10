"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Importa o CanvasMinimal dinamicamente, desabilitando o SSR.
const CanvasMinimal = dynamic(
  () => import('./CanvasMinimal'),
  {
    ssr: false, // A opção mais importante: garante que o componente só renderize no cliente.
    loading: () => <p style={{ height: '100vh', textAlign: 'center' }}>Carregando Editor...</p>
  }
);

export default function MinimalEditorPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f0f0f0' }}>
      <CanvasMinimal />
    </div>
  );
}