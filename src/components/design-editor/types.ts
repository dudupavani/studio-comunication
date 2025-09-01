export type BaseShape = {
  id: string;
  type: "rect" | "text" | "image"; // vamos expandir depois
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fill?: string;
};
