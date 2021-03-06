import ContractModel from "../../models/Contract";
import TokenHolderModel from "../../models/TokenHolder";
import TransferTokenModel from "../../models/Transfer"

const moment = require("moment");


import Utils from "../../utils";

export default class ContractManager {
    async getTotalTokens() {
        Utils.lhtLog("ContractManager:getTotalTokens", "getTotalTokens count", "", "")
        return await ContractModel.count({"ERC": {"$gt": 0}});
    }

    async getTotalContracts() {
        Utils.lhtLog("ContractManager:getTotalContracts", "getTotalContracts count", "", "")
        return await ContractModel.count();
    }

    async getListOfTokens(req) {
        Utils.lhtLog("ContractManager:getListOfTokens", "getListOfTokens", req, "");
        let resultSet = await ContractModel.getContractList({"ERC": {"$gt": 0}}, {
            address: 1,
            tokenName: 1,
            symbol: 1,
            sourceCode: 1,
            compilerVersion: 1,
            abi: 1,
            totalSupply: 1,
            decimals:1
        }, parseInt(req.skip), parseInt(req.limit), {_id: -1});
        const resultArray = []
        for (let v of resultSet) {
            let holderCount = await TokenHolderModel.countDocuments({tokenContract: v.address});
            // console.log('h----',v)
            if (v.abi != '' && v.sourceCode != '' && v.compilerVersion != '') {
                resultArray.push({
                    "_id": v._id,
                    "address": v.address,
                    "tokenName": v.tokenName,
                    "symbol": v.symbol,
                    "type": "XRC20",
                    "status": "verified",
                    "totalSupply": v.totalSupply,
                    "tokenHolders": holderCount,
                    decimals:v.decimals
                })
            } else {
                resultArray.push({
                    "_id": v._id,
                    "address": v.address,
                    "tokenName": v.tokenName,
                    "symbol": v.symbol,
                    "type": "XRC20",
                    "status": "unverified",
                    "totalSupply": v.totalSupply,
                    "tokenHolders": holderCount,
                    decimals:v.decimals
                })
            }
        }
        return resultArray;
    }

    async getListOfContracts(req) {
        Utils.lhtLog("ContractManager:getListOfContracts", "getListOfContracts", req, "");
        let selectionKey = {
            address: 1.0,
            blockNumber: 1.0,
            ERC: 1.0,
            creationTransaction: 1.0,
            contractName: 1.0,
            tokenName: 1.0,
            symbol: 1.0,
            owner: 1.0,
            decimals: 1.0,
            totalSupply: 1.0,
            abi: 1.0,
            isCreatedOn: 1.0,
            isModifiedOn: 1.0,
            isActive: 1.0,
            isDeleted: 1.0,
        }
        return await ContractModel.getContractList({}, selectionKey, parseInt(req.skip), parseInt(req.limit), {blockNumber: -1});

    }

    async contractDetailsUsingAddressResponse(req) {
        Utils.lhtLog("ContractManager:contractDetailsUsingAddressResponse", "contractDetailsUsingAddressResponse", req, "");
        let contractResponse = await ContractModel.getContract({address: req.contractAddress});
        let response = {};
        let contractStatus = 'Unverified';
        if (!contractResponse) {
            return response
        }
        contractResponse =contractResponse.toJSON()
        if (contractResponse.sourceCode && contractResponse.abi && contractResponse.byteCode) {
            contractStatus = "Verified"
        } else {
            contractStatus = "Unverified"
        }
        return {
            contractResponse, contractStatus
        };
    }

    async getContractSearch(res) {
        Utils.lhtLog("ContractManager:getContractSearch", "getContractSearch", res, "");
        let skip = 0
        let limit = 0
        let keywords = ''
        if(res.skip){
            skip = parseInt(res.skip)
        }
        if(res.limit){
            limit = parseInt(res.limit)
        }
        if(res.keywords){
            keywords = res.keywords
        }
            const totalResult = await ContractModel.countData( { $or: [ { address: { $regex : ".*" + keywords + ".*", $options: 'i' } },
                { tokenName: { $regex : ".*" + keywords + ".*", $options: 'i' } } ] }
                 )            

            const datas = await ContractModel.getContractList( { $or: [ { address: { $regex : ".*" + keywords + ".*", $options: 'i' } },
                { tokenName: { $regex : ".*" + keywords + ".*", $options: 'i' } } ] },"",skip,limit)
            return {"response":datas , "totalRecord":totalResult}
    }

    async getListOfHoldersForToken(req) {
        Utils.lhtLog("ContractManager:getListOfHoldersForToken", "getListOfHoldersForToken", "", "");
        let findObj = {
            tokenContract: req.params.address
        };
        let responseCount = await TokenHolderModel.countDocuments(findObj);
        let response = await TokenHolderModel.getHolderList(findObj, {}, parseInt(req.query.skip), parseInt(req.query.limit), {balance: -1});
        /**
         A token which has the maximum no. of address for a particular contract address has the rank 1 and go on.
         Percentage will be calculated on the basis of Quantity/Total supply for that token * 100
         */
        let total = 0;
        response.sort(function (a, b) {
            return (Number(b.balance) / parseFloat(10 ** parseInt(b.decimals))) - (Number(a.balance) / parseFloat(10 ** parseInt(a.decimals)));
        });
        response.map(function (t) {
            total += t.balance;
        });

        const data = response.map(function (t, index) {
            t.percentage = (Number(t.balance) / parseFloat(10 ** parseInt(t.decimals))) / total;
            t.quantity = (Number(t.balance) / parseFloat(10 ** parseInt(t.decimals)));
            return [{
                Rank: index + 1,
                Address: t.address,
                Quantity: t.quantity,
                Percentage: t.percentage,
                Value: t.balance,
            }];
        });

        return {data, responseCount}

    }

    async someDaysHolders(req) {
        Utils.lhtLog("ContractManager:someDaysHolders", "", "", "");
        let numberOfDays= Number(req.params.numberOfDays);
        let endTime = parseInt(moment().valueOf() / 1000);
        let startTime = parseInt(moment().subtract(req.params.numberOfDays, "days").valueOf() / 1000);

        let responseHolder = await TransferTokenModel.aggregate(
            [{
                $match: {
                    $and: [
                        {"timestamp": {"$gte": startTime, "$lte": endTime}},
                        {"contract": req.params.address}
                    ]
                }
            },
                {
                    $group:
                        {
                            _id:
                                {
                                    day: {
                                        $dayOfMonth: {
                                            "$add": [new Date(0), {"$multiply": [1000, "$timestamp"]}
                                            ]
                                        }
                                    },
                                    month: {
                                        $month: {
                                            "$add": [new Date(0), {"$multiply": [1000, "$timestamp"]}
                                            ]
                                        }
                                    },
                                    year: {
                                        $year: {
                                            "$add": [new Date(0), {"$multiply": [1000, "$timestamp"]}
                                            ]
                                        }
                                    }
                                },
                            uniqueCount1: {$addToSet: "$to"},
                            uniqueCount2: {$addToSet: "$from"},
                            count: {$sum: 1},
                            date: {
                                $first: {
                                    "$add": [new Date(0), {"$multiply": [1000, "$timestamp"]}
                                    ]
                                }
                            }
                        }
                },

                {$sort: {date: 1}},
                {
                    $project:
                        {
                            date:
                                {
                                    $dateToString: {format: "%Y-%m-%d", date: "$date"}
                                },
                            toCount: {$size: "$uniqueCount1"},
                            fromCount: {$size: "$uniqueCount2"},
                            // total:      {$add:[Number("$toCount"),Number("$fromCount")]},
                            count: 1,
                            _id: 0
                        }
                }
            ])

        const resultArray = []
        if(responseHolder.length>0)
        responseHolder.map((item) => {
            resultArray.push({"date": item.date, "count": (item.toCount + item.fromCount)})
        });
        else{
        for (let index = numberOfDays; index > 0; index--) {
            let startTime = parseInt(moment().subtract(index, "days").valueOf() / 1000);
               resultArray.push({"date": moment.unix(startTime).format("YYYY-MM-DD"), "count": 0})
   
        }
    }

        return resultArray
    }

    async getHolderDetailsUsingAddress(req) {
        Utils.lhtLog("ContractManager:getHolderDetailsUsingAddress", "", "", "");
        let result = [];
        let address = req.query.address;
        let skip = parseInt(req.query.skip);
        let limit = parseInt(req.query.limit);
        let queryStr;
        if (req.query.keywords) {
            queryStr = {
                $or: [
                    {"hash": {'$regex': req.query.keywords, '$options': 'i'}}
                ],
                "from": address
            }
        } else {
            queryStr = {from: address}
        }

        let holderDetails = await TokenHolderModel.findOne({address: address});
        let holderTransactions = await TransferTokenModel.find(queryStr, {
            hash: 1,
            timestamp: 1,
            blockNumber: 1,
            from: 1,
            to: 1,
            value: 1
        }).skip(skip).limit(limit).sort({balance: -1});
        let holderTransactionsCount = await TransferTokenModel.countDocuments(queryStr);
        result.push({
            Holder_address: holderDetails && holderDetails.address,
            Holder_token_balance: holderDetails && holderDetails.balance,
            Total_transfes_transactions_Count: holderTransactionsCount,
            Contract_address: holderDetails && holderDetails.tokenContract,
            Transfers: JSON.stringify(holderTransactions)
        });
        return result;
    }

    async getTokenUsingTokenNameAndAddress(reqObj) {
        Utils.lhtLog("BLManager:getTokenUsingTokenNameAndAddress", "getTokenUsingTokenNameAndAddress", "", "");
        let skip = 0;
        let limit = 0;
        let resultSet = [];
        try {
            if (reqObj.query.data) {
                if (reqObj && reqObj.query.skip)
                    skip = parseInt(reqObj.query.skip)
                if (reqObj && reqObj.query.limit)
                    limit = parseInt(reqObj.query.limit)

                resultSet = await ContractModel.aggregate([
                    {
                        $addFields: {
                            tokenStatus: {

                                "$add": [
                                    {"$cond": [{"$ifNull": ["$compilerVersion", null]}, 1, 0]},
                                    {"$cond": [{"$ifNull": ["$sourceCode", null]}, 1, 0]},
                                    {"$cond": [{"$ifNull": ["$abi", null]}, 1, 0]},
                                ]
                            },
                        }
                    },
                    {
                        $match: {
                            "ERC": {"$gt": 0},
                            $or: [
                                {address: {"$regex": reqObj.query.data, "$options": "i"}},
                                {tokenName: {"$regex": reqObj.query.data, "$options": "i"}}
                            ]
                        },

                    },
                    {
                        "$lookup": {
                            "from": "xin-tokenholders",
                            "localField": "address",
                            "foreignField": "tokenContract",
                            "as": "tokenholders"
                        }
                    },
                    {$skip: skip},
                    {$limit: limit},
                    {
                        $project: {
                            _id: 1, address: 1, "type": "XRC20", tokenName: 1, tokenHolders: {$size: "$tokenholders"},totalSupply:1,symbol:1,decimals:1,
                            status: {$cond: {if: {$gte: ["$tokenStatus", 3]}, then: "verified", else: "unverified"}}
                        }
                    }
                ]);
            }
        } catch (error) {
            console.log(error)
        }
        return {resultSet, "total": resultSet.length}
    }

}