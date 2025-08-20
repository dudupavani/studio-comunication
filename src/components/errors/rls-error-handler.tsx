// src/components/errors/rls-error-handler.tsx
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface RLSErrorHandlerProps {
  error: any;
  refetch?: () => void;
  message?: string;
}

export function RLSErrorHandler({ 
  error, 
  refetch,
  message = "Você não tem permissão para acessar este recurso."
}: RLSErrorHandlerProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Verifica se é um erro de RLS do Supabase
  const isRLSError = error?.message?.includes("new row violates row-level security policy");
  
  if (!isRLSError) {
    return null;
  }
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Acesso Negado</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{message}</p>
        
        {showDetails && (
          <div className="text-xs mt-2 p-2 bg-red-50 rounded">
            <p className="font-medium">Detalhes técnicos:</p>
            <p>{error.message}</p>
          </div>
        )}
        
        <div className="flex gap-2 mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Ocultar" : "Ver"} detalhes
          </Button>
          
          {refetch && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={refetch}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}