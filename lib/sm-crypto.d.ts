declare module "sm-crypto" {
  export interface Sm4Options {
    mode?: "cbc" | "ecb";
    iv?: string;
    padding?: "pkcs#7" | "pkcs#5" | "none";
    output?: "string" | "array";
  }

  export const sm4: {
    encrypt(data: string, key: string, options?: Sm4Options): string;
    decrypt(data: string, key: string, options?: Sm4Options): string;
  };
}
