import * as t from "io-ts";
import { FastifyRequest, FastifyReply } from "fastify";


export type GlobalLogger =
  {
    info: (msg: string) => void,
    error: (msg: string) => void,
    debug: (msg: string) => void
  }

export type Config = t.TypeOf<typeof ConfigCodec>
export const ConfigCodec = t.type({

}, "Config")

export type HandlerConfig =
  {
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE"
    function: Handler
  }

export type HttpResponsePayload =
  SuccessHttpResponsePayload | ErrorResponsePayload

export type SuccessHttpResponsePayload =
  {
    status: true,
    payload?: unknown
  }

export type ErrorResponsePayload =
  {
    status: false,
    errorMessage: string
  }

export type Handler = (req: FastifyRequest, res: FastifyReply) => Promise<HttpResponsePayload>
