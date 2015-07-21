import request from 'superagent-bluebird-promise';
import { APIEndpoints } from '../../constants/AppConstants';

module.exports = {
  login: function(uuid, accessToken) {
    return request.post(APIEndpoints.LOGIN)
      .send({ uuid: uuid, accessToken: accessToken, grant_type: 'password' })
      .set('Accept', 'application/json')
  }
}
