import Utils from "../../utils";
import { apiSuccessMessage, httpConstants } from "../../common/constants";
import BLManager from "./manager";

export default class Index {
  async getTokenBalance(request, response) {
    try {
      const [error, getBalanceResponse] = await Utils.parseResponse(
        new BLManager().getTokenBalance(request.body)
      );
      if (error) {
        return Utils.handleError(error, request, response);
      }
      return Utils.response(
        response,
        getBalanceResponse,
        apiSuccessMessage.FETCH_SUCCESS,
        httpConstants.RESPONSE_STATUS.SUCCESS,
        httpConstants.RESPONSE_CODES.OK
      );
    } catch (error) {
      return Utils.handleError(error, request, response);
    }
  }

  async getTokenTransferCount(request, response) {
    try {
      const [error, getBalanceResponse] = await Utils.parseResponse(
        new BLManager().getTokenTransferCount(request.body)
      );
      if (error) {
        return Utils.handleError(error, request, response);
      }
      return Utils.response(
        response,
        getBalanceResponse,
        apiSuccessMessage.FETCH_SUCCESS,
        httpConstants.RESPONSE_STATUS.SUCCESS,
        httpConstants.RESPONSE_CODES.OK
      );
    } catch (error) {
      return Utils.handleError(error, request, response);
    }
  }
}
