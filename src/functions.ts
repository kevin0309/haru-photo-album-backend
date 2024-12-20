import * as O from "fp-ts/lib/Option"
import * as E from "fp-ts/lib/Either"
import * as T from 'fp-ts/lib/Task'
import * as TE from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/function"
import * as fs from 'fs'
import { createHash } from 'crypto'

import * as types from './types'
import * as utils from './utils'
import Fastify from "fastify"


export const checkConfigEnv =
  (): E.Either<string, types.Config> =>
    pipe(
      E.Do,
      // E.bind("applicationName", () =>
      //   E.fromNullable("applicationName not found")(process.env["APPLICATION_NAME"])),
      // E.bind("applicationServerPort", () => pipe(
      //   E.fromNullable("applicationServerPort not found")(process.env["APPLICATION_SERVER_PORT"]),
      //   E.map(Number),
      //   E.chain(_ => Number.isNaN(_) ? E.left("applicationServerPort wrong format") : E.right(_))
      // )),
      E.chain(obj => pipe(
        types.ConfigCodec.decode(obj),
        E.mapLeft(utils.convertErrorsToString)
      )),
      E.mapLeft(e => `checkConfigEnv(): unexpected error(${e})`)
    )

export const loadConfigFile =
  (executeMode: string): E.Either<string, types.Config> =>
    pipe(
      // 파일로부터 load
      E.tryCatch(
        () => fs.readFileSync(`./.env/${executeMode}.json`, 'utf-8'),
        e => `fs.readFileSync(): error(${utils.errorToString(e)})`
      ),
      // JSON 파싱
      E.chain(fileString => E.tryCatch(
        () => JSON.parse(fileString),
        e => `JSON.parse(): error(${utils.errorToString(e)})`
      )),
      // type Validation
      E.chain(obj => pipe(
        types.ConfigCodec.decode(obj),
        E.mapLeft(utils.convertErrorsToString)
      )),
      E.mapLeft(e => `loadConfigFile(): unexpected error(${e})`)
    )

export const generateConsoleLogger = (): types.GlobalLogger =>
  ({
    info: console.log,
    error: console.error,
    debug: console.log
  })

export const initializeFastifyServer =
  (port: number) => (handlers: Array<types.HandlerConfig>): TE.TaskEither<string, string> =>
    pipe(
      E.tryCatch(
        () => Fastify({
          logger: false,
          connectionTimeout: 60000,
          requestTimeout: 60000,
          bodyLimit: 10485760
        }),
        e => `initialize Fastify app error(${utils.errorToString(e)})`
      ),
      E.chain(app => pipe(
        handlers.map(handler => E.tryCatch(
          () => {
            switch (handler.method)
            {
              case "GET":
                app.get(handler.path, handler.function)
                break
              case "POST":
                app.post(handler.path, handler.function)
                break
              case "PUT":
                app.put(handler.path, handler.function)
                break
              case "DELETE":
                app.delete(handler.path, handler.function)
                break
              default:
                throw new Error(`Handler method [${handler.method}] not supported.`)
            }
          },
          e => `bind handler error(${JSON.stringify(handler)}, error: ${utils.errorToString(e)})`
        )),
        E.sequenceArray,
        E.map(() => app)
      )),
      TE.fromEither,
      TE.chain(app => TE.tryCatch(
        () => app.listen({port, host: "0.0.0.0"}),
        e => `server listen error(${utils.errorToString(e)})`
      )),
      TE.bimap(
        e => `initializeFastifyServer(): error occurred(${e})`,
        res => `initializeFastifyServer(): Successfully initialize server!(${res})\n`
          + handlers
            .map(handler => ` # [${handler.method}] ${handler.path} -> ${handler.function.name}`)
            .join('\n')
      )
    )
