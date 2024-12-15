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
        logger.info(`Successfully exit system`)
      })
      .catch(e => {
        // When an error occurs
        logger.error(`Unexpected error occurred on exit system(${utils.errorToString(e)})`)
      })
      .finally(() => {
        // Final things to do
        // for WinstonLogger
        // setTimeout(() => logger.end(), 1000)
        setTimeout(() => process.exit(128 + 2), 1500)
      })

export const main =
  pipe(
    console.log("load Configs..."),
    () => pipe(
      func.checkConfigEnv(),
      E.fold(
        e => {
          console.log(`load Configs from envs failed(${e}), load from alternatives(config.json file)...`)
          return pipe(
            func.loadConfigFile(),
            E.map(_ => {
              console.log("Successfully load Configs from config.json file!")
              return _
            }),
            E.mapLeft(e => {
              console.log(`load from alternatives(config.json) failed...(${e})`)
              return e
            })
          )
        },
        _ => {
          console.log("Successfully load Configs from envs!")
          return E.right(_)
        }
      )
    ),
    TE.fromEither,
    TE.chain(config => pipe(
      func.generateConsoleLogger(),
      (logger) => pipe(
        [
          {
            path: "/",
            method: "GET",
            function: handlers.healthCheckHandler
          }
        ],
        func.initializeFastifyServer(config.applicationServerPort),
        TE.map(res => {
          // 모든 초기화 작업 완료 후 프로세스 이벤트 핸들러 등록
          process.on("SIGINT", () => systemExitHandler(logger))
          process.on("SIGTERM", () => systemExitHandler(logger))
          logger.info(`main(): Successfully initialize server!(${res})`)
          return E.right(true)
        })
      )
    )),
    TE.mapLeft(() => {
      // 에러 발생하면 프로세스 강제로 종료 -> 이 후 다시 실행할 수 있도록
      setTimeout(() => process.exit(128 + 2), 2000)
    })
  )

main()