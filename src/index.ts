import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import mongoose from 'mongoose'

import * as types from './types'
import * as utils from './util/utils'
import * as func from './util/functions'
import * as handlers from './controller/handlers'


const systemExitHandler =
  async (logger: types.GlobalLogger) =>
  {
    try {
      logger.info(`main(): disconnect MongoDB connection start`)
      await mongoose.disconnect()
      logger.info(`main(): disconnect MongoDB connection done`)

      logger.info(`main(): successfully exit system`)
    }
    catch (e)
    {
      logger.error(`main(): unexpected error occurred on exit system(${utils.errorToString(e)})`)
    }
    finally {
      logger.info(`main(): shutdown system in 1500ms..`)
      setTimeout(() => process.exit(128 + 2), 1500)
    }
  }

export const main =
  pipe(
    // load configs
    pipe(
      func.checkConfigEnv(),
      E.bimap(
        e => {
          console.log(`main(): load Configs from envs failed(${e})...`)
          return e
        },
        config => {
          console.log("main(): successfully load Configs from envs!")
          return config
        }
      )
    ),
    TE.fromEither,
    TE.chain(config => pipe(
      TE.Do,
      // initialize logger
      TE.let('logger', () => func.generateConsoleLogger()),
      // initialize MongoDB conn
      TE.bind('mongodbConnection', ctx =>
        pipe(
          func.initializeMongoDbConn(ctx.logger, config.mongodbUri),
          TE.bimap(
            e => { ctx.logger.error(e); return e },
            res => { ctx.logger.info(res); return res }
          )
        )
      ),
      // initialize fastify
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
        ctx.logger.info(`main(): initialize done!`)
      }
    )
  )

main()