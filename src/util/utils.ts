import * as E from 'fp-ts/lib/Either'
import * as t from 'io-ts';
import { PathReporter } from "io-ts/PathReporter";


export const errorToString = (e: unknown): string =>
  e instanceof Error ?
    e.toString() :
    typeof e === 'string' ? e :
      String(e)

export const convertErrorsToString = (e: t.Errors): string =>
  PathReporter.report(E.left(e)).join(" // ")