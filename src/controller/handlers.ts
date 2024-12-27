import * as O from 'fp-ts/lib/Option'
import * as E from 'fp-ts/lib/Either'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import * as types from '../types'
import * as func from '../util/functions'


// Http response status 2XX에 대하여 허용
const ALLOWED_HTTP_RESPONSE_STATUS_LIST_2XX = Array.from(Array(100).keys()).map(_ => _ + 200)

export const healthCheckHandler: types.Handler =
  async (req, res) =>
    new Promise((resolve) => {
      res.statusCode = 200
      resolve({
        status: true
      })
    })