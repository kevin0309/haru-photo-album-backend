import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import * as types from './types'
import * as utils from './utils'
import * as func from './functions'
import * as handlers from './handlers'


const systemExitHandler =
  (logger: types.GlobalLogger) =>
    new Promise(resolve => {
      // First things to do

      resolve(true)
    })
      .then(() => {
        // Second things to do
        logger.info(`main(): Successfully exit system`)
      })
      .catch(e => {
        // When an error occurs
        logger.error(`main(): Unexpected error occurred on exit system(${utils.errorToString(e)})`)
      })
      .finally(() => {
        // Final things to do
        // for WinstonLogger
        // setTimeout(() => logger.end(), 1000)
        setTimeout(() => process.exit(128 + 2), 1500)
      })

export const main =
  pipe(
    pipe(
      E.Do,
      E.bind('nodeEnv', () => E.fromNullable(`main(): NODE_ENV env not found!`)(process.env["NODE_ENV"])),
      E.bind('applicationServerPort', () => pipe(
        E.fromNullable(`main(): APPLICATION_SERVER_PORT env not found!`)(process.env["APPLICATION_SERVER_PORT"]),
        E.map(port => Number(port)),
        E.chain(port => Number.isNaN(port) ?
          E.left(`main(): wrong APPLICATION_SERVER_PORT(${port})`) :
          E.right(port)
        )
      )),
      E.mapLeft(e => {
        console.log(e)
        return e
      })
    ),
    E.chain(envs => pipe(
      func.checkConfigEnv(),
      E.fold(
        e => {
          console.log(`main(): load Configs from envs failed(${e}), load from alternatives(config.json file)...`)
          return pipe(
            func.loadConfigFile(envs.nodeEnv),
            E.bimap(
              e => {
                console.log(`main(): load from alternatives(config.json) failed...(${e})`)
                return e
              },
              config => {
                console.log("main(): Successfully load Configs from config.json file!")
                return config
              }
            )
          )
        },
        config => {
          console.log("main(): Successfully load Configs from envs!")
          return E.right(config)
        }
      ),
      E.map(config => ({
        ...envs,
        ...config
      }))
    )),
    TE.fromEither,
    TE.chain(config => pipe(
      TE.Do,
      TE.let('logger', () => func.generateConsoleLogger()),
      TE.bind('fastifyServer', ctx => pipe(
        // handlers to bind
        [
          {
            path: "/",
            method: "GET",
            function: handlers.healthCheckHandler
          }
        ],
        func.initializeFastifyServer(config.applicationServerPort),
        TE.bimap(
          e => { ctx.logger.error(e); return e },
          res => { ctx.logger.info(res); return res }
        )
      ))
    )),
    TE.match(
      () => {
        // 에러 발생하면 프로세스 강제로 종료 -> 이 후 다시 실행할 수 있도록
        setTimeout(() => process.exit(128 + 2), 2000)
      },
      ctx => {
        // 모든 초기화 작업 완료 후 프로세스 이벤트 핸들러 등록
        process.on("SIGINT", () => systemExitHandler(ctx.logger))
        process.on("SIGTERM", () => systemExitHandler(ctx.logger))
        ctx.logger.info(`main(): Initialize done!`)
      }
    )
  )

main()