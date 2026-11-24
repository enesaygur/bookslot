
declare module "iyzipay" {
  type Callback = (err: Error | null, result: any) => void;

  interface Resource {
    create(request: any, callback: Callback): void;
    retrieve(request: any, callback: Callback): void;
  }

  class Iyzipay {
    constructor(config: {
      apiKey: string;
      secretKey: string;
      uri: string;
    });

    checkoutFormInitialize: Resource;
    apiTest: Resource;
    checkoutForm: Resource;

    static LOCALE: {
      TR: string;
      EN: string;
    };

    static CURRENCY: {
      TRY: string;
      USD: string;
      EUR: string;
    };

    static PAYMENT_GROUP: {
      PRODUCT: string;
    };

    static BASKET_ITEM_TYPE: {
      VIRTUAL: string;
      PHYSICAL: string;
    };
  }

  export default Iyzipay;
}
