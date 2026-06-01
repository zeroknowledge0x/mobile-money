import { Request, Response, NextFunction } from "express";
import { validateNetworkMiddleware } from "../validateNetworkMiddleware";

describe("validateNetworkMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusCode: number;
  let jsonData: unknown;

  beforeEach(() => {
    statusCode = 200;
    jsonData = null;

    req = {
      body: {},
    };

    res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        jsonData = data;
      },
    };

    next = jest.fn();
  });

  it("should resolve MTN for a valid international phone number", () => {
    req.body = {
      phoneNumber: "+237670000000",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("MTN");
    expect(statusCode).toBe(200);
  });

  it("should resolve ORANGE for a valid local phone number", () => {
    req.body = {
      phoneNumber: "22507123456",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("ORANGE");
  });

  it("should reject unsupported network prefixes", () => {
    req.body = {
      phoneNumber: "+1234567890",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(400);
    expect(jsonData).toEqual(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.any(Array),
      }),
    );
  });

  it("should resolve VODACOM for Tanzania +25574 prefix", () => {
    req.body = {
      phoneNumber: "+255741234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("VODACOM");
  });

  it("should resolve VODACOM for Tanzania +25575 prefix", () => {
    req.body = {
      phoneNumber: "+255751234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("VODACOM");
  });

  it("should resolve VODACOM for Tanzania +25576 prefix", () => {
    req.body = {
      phoneNumber: "+255761234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("VODACOM");
  });

  it("should resolve TIGO for Tanzania +25565 prefix", () => {
    req.body = {
      phoneNumber: "+255651234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("TIGO");
  });

  it("should resolve TIGO for Tanzania +25566 prefix", () => {
    req.body = {
      phoneNumber: "+255661234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("TIGO");
  });

  it("should resolve TIGO for Tanzania +25567 prefix", () => {
    req.body = {
      phoneNumber: "+255671234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("TIGO");
  });

  it("should resolve TIGO for Tanzania +25571 prefix", () => {
    req.body = {
      phoneNumber: "+255711234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("TIGO");
  });

  it("should resolve TIGO for local Tanzania 065 prefix", () => {
    req.body = {
      phoneNumber: "0651234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("TIGO");
  });

  it("should resolve VODACOM for local Tanzania 074 prefix", () => {
    req.body = {
      phoneNumber: "0741234567",
    };

    validateNetworkMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req.body as any).resolvedNetwork).toBe("VODACOM");
  });
});
