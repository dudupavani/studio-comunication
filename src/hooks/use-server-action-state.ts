"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useServerActionState<State>(
  action: (prevState: State, formData: FormData) => Promise<State>,
  initialState: State
): [State, (formData: FormData) => Promise<void>] {
  const [state, setState] = useState<State>(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const formAction = useCallback(
    async (formData: FormData) => {
      const nextState = await action(stateRef.current, formData);
      setState(nextState);
    },
    [action]
  );

  return [state, formAction];
}
