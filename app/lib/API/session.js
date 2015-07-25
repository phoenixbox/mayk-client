import request from 'superagent-bluebird-promise';
import { APIEndpoints } from '../../constants/AppConstants';

module.exports = {
  login: function(uuid, access_token) {
    return request.post(APIEndpoints.LOGIN)
      .send({ uuid: uuid, access_token: access_token, grant_type: 'password' })
      .set('Accept', 'application/json')
  },
  logout: function(uuid, access_token) {
    return request.get(APIEndpoints.LOGOUT)
      .query({source: 'client'})
      .set('Accept', 'application/json')
  }
}
