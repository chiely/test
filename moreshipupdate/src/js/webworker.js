class DataHandler {

    constructor() {
        this._alltargets = [];
    }

    _update(olddata = [], newdata = [], mode) {
        console.time('datahandler');
        this._alltargets = olddata;
        this._mode = mode;
        var newlist = this._convertShipList(newdata);
        this.checkIdRepeat(newlist);
        this._removeInvalidTarget(newlist);
        this._updateAllTargets(newlist);
        console.timeEnd('datahandler');
        console.log('Webworker - Posting message');
        postMessage(this._alltargets);
    }

    checkIdRepeat(arr) {
        var ids = [];
        arr.forEach(function (v) {
            ids.push(v.id);
        });
        var hash = {};
        for(var i in ids) {
            if(hash[ids[i]]) {
                console.log('出现重复id,值为:' + ids[i]);
                return 1;
            }
            hash[ids[i]] = true;
        }
    }

    _removeInvalidTarget(newlist) {
        this._alltargets = this._alltargets.filter(function (value) {
            // 选中状态的目标暂不清除
            return this._isContain(value, newlist) || value.eventTag.isSelect;
        }.bind(this));
    }

    _updateAllTargets(newlist) {
        for(let i = 0, len = newlist.length; i < len; i++) {
            this._updateOneTarget(newlist[i]);
        }
    }

    _updateOneTarget(obj) {
        var iscontain = false;
        for(let i = 0, len = this._alltargets.length; i < len; i++) {
            let data = this._alltargets[i];
            // 如果当前图层有新目标，更新
            if(data.id === obj.id) {
                iscontain = true;
                this._alltargets[i] = Object.assign({}, data, obj);
                break;
            }
        }
        // 如果当前图层没有新目标，添加（可以加上个数限制）
        if(!iscontain) {
            obj.eventTag = {
                isSelect: 0
            };
            this._alltargets.push(obj);
        }
    }

    _isContain(obj, arr) {
        var iscontain = false;
        for(let i = 0, len = arr.length; i < len; i++) {
            if(arr[i].id === obj.id) {
                iscontain = true;
                break;
            }
        }
        return iscontain;
    }

    _convertShipList(data) {
        var shiplist = this.isArray(data) ? data : data.msg.shipList;
        var newlist = [];
        for(let i = 0, len = shiplist.length; i < len; i++) {
            let targetobj = this._convertTargetObj(shiplist[i]);
            newlist.push(targetobj);
        }
        return newlist;
    }

    _convertTargetObj(oneinfo) {
        var onetarget = {}
        onetarget.originalObj = oneinfo;
        onetarget.country = this.getDetialConvertName(oneinfo.co, 'country') // 国别country 中文（过滤）
        onetarget.countryOrig = oneinfo.co.replace(/@/g, '') // 监控统计需要原始的国家名
        onetarget.infotype = oneinfo.mt // 信息类型 int
        onetarget.infosrc = oneinfo.ms // 信息来源 int 0;1,2,3
        onetarget.num = oneinfo.nu // 目标编号num int
        onetarget.lng = parseFloat(oneinfo.lo / 600000) // 经度
        onetarget.lat = parseFloat(oneinfo.la / 600000) // 纬度
        onetarget.dir = parseFloat((oneinfo.di / 10).toFixed(1)) // 船航向 int
        onetarget.heading = oneinfo.he // 船首向 int
        onetarget.shipname = oneinfo.sn.replace(/@/g, '') || '' // 船名
        onetarget.shiptype = this.getDetialConvertName(oneinfo.st, 'ship_type') // 船舶类型 int（过滤）
        onetarget.time = oneinfo.ti
        onetarget.speed = oneinfo.sp / 10 || ''
        // 自定义属性
        onetarget.id = this._getShipIdMode(oneinfo).id // 计算后的id，作为船舶的唯一id
        onetarget.mode = this._getShipIdMode(oneinfo).mode // 自定义 当前模式
        onetarget.filterSrc = this.getShipSrc(oneinfo)
        return onetarget
    }

    getDetialConvertName(code, type) {
        var res = '';
        code = '' + code + '';
        if(type == 'ship_type') { // 船舶类型（过滤）
            switch(code) {
            case '1':
                res = '货船'
                break
            case '2':
                res = '搜救船'
                break
            case '3':
                res = '油轮'
                break
            case '6':
                res = '拖船'
                break
            case '5':
                res = '渔船'
                break
            case '7':
                res = '客船'
                break
            case '8':
                res = '军事船'
                break
            default:
                res = '其他'
            }
        } else if(type == 'country') { // 国别（过滤）
            switch(code) {
            case '中国':
                res = '中国'
                break
            case '美国':
                res = '美国'
                break
            case '英国':
                res = '英国'
                break
            case '法国':
                res = '法国'
                break
            case '俄罗斯':
                res = '俄罗斯'
                break
            default:
                res = '其他'
            }
        } else if(type == 'hwlx') { // 货物类型
            res = code
        } else if(type == 'status') { // 航行状态
            switch(code) {
            case '0':
                res = '机动船在航'
                break
            case '1':
                res = '锚泊'
                break
            case '2':
                res = '船舶失控'
                break
            case '3':
                res = '船舶操作受限'
                break
            case '4':
                res = '受吃水限制，船舶行动受限'
                break
            case '5':
                res = '系泊'
                break
            case '6':
                res = '搁浅'
                break
            case '7':
                res = '从事捕捞'
                break
            case '8':
                res = '船舶在航'
                break
            default:
                res = ''
            }
        } else if(type == 'fixing_device') { // 电子定位装置
            switch(code) {
            case '-1':
                res1 = '非法'
                break
            case '0':
                res = '默认'
                break
            case '1':
                res = 'GPS'
                break
            case '2':
                res = 'GLONASS'
                break
            case '3':
                res = 'GPS/GLONASS组合'
                break
            case '4':
                res = 'Loran-C'
                break
            case '5':
                res = 'Chayka'
                break
            case '6':
                res = '综合导航系统'
                break
            case '7':
                res = '观测'
                break
            case '8':
                res = '北斗'
                break
            case '9':
            case '10':
            case '11':
            case '12':
            case '13':
            case '14':
                res = '未使用'
                break
            case '15':
                res = '内部GNSS'
                break
            default:
                res = code
            }
        } else if(type == 'commun_state') { // 通信状态
            switch(code) {
            case '0':
                res = ''
                break
            case '1':
                res = 'SOTDMA'
                break
            case '2':
                res = 'ITDMA'
                break
            default:
                res = code
            }
        } else if(type == 'pos_accuracy') { // 船位精度
            switch(code) {
            case '0':
                res = ''
                break
            case '1':
                res = '定位误差大于10米'
                break
            case '2':
                res = '定位误差小于等于10米'
                break
            default:
                res = code
            }
        } else if(type == 'orig_info_source') { // 信息来源
            switch(code) {
            case '1':
                res = '农业部'
                break
            case '2':
                res = '海事局'
                break
            case '3':
                res = '海监'
                break
            case '4':
                res = '星载AIS'
                break
            case '5':
                res = '救捞局'
                break
            case '7':
                res = '保障局'
                break
            default:
                res = code
            }
        } else if(type == 'orig_info_type') { // 信息类型
            switch(code) {
            case '1':
                res = 'Argos及海事卫星'
                break
            case '2':
                res = '北斗'
                break
            case '3':
                res = 'AIS静态'
                break
            case '4':
                res = 'AIS动态'
                break
            case '5':
                res = 'LRIT'
                break
            case '7':
                res = '船舶信息'
                break
            case '15':
                res = '综合信息'
                break
            default:
                res = code
            }
        }
        return res
    }

    _getShipIdMode(targetobj) {
        var idmo = { id: null, mode: null };
        if(this._mode === 0) {
            idmo.id = targetobj.nu;
            idmo.mode = 0;
        } else {
            idmo.id = targetobj.ms.toString() + targetobj.mt.toString() + targetobj.nu.toString();
            idmo.mode = targetobj.mt;
        }
        return idmo;
    }

    getShipSrc(targetobj) {
        var src = -1
        if(targetobj.ms === 3 && targetobj.mt === 7) {
            src = 1
        } else if(targetobj.ms === 1 && (targetobj.mt === 3 || targetobj.mt === 4)) {
            src = 2
        } else if(targetobj.ms === 1 && targetobj.mt === 1) {
            src = 3
        } else if(targetobj.ms === 1 && targetobj.mt === 2) {
            src = 4
        } else if(targetobj.ms === 2 && (targetobj.mt === 3 || targetobj.mt === 4)) {
            src = 5
        } else if(targetobj.ms === 2 && targetobj.mt === 5) {
            src = 6
        } else if(targetobj.ms === 7 && targetobj.mt === 7) {
            src = 7
        } else if(targetobj.ms === 5 && targetobj.mt === 7) {
            src = 8
        } else if(targetobj.ms === 4 && (targetobj.mt === 3 || targetobj.mt === 4)) {
            src = 9
        } else if(targetobj.ms === 15) {
            src = 15
        }
        return src
    }

    isArray(o) {
        return Object.prototype.toString.call(o) == '[object Array]';
    }
}

var dataHandlerInstance = new DataHandler();

onmessage = function (e) {
    console.log('Webworker - Message received');
    dataHandlerInstance._update(e.data.olddata, e.data.newdata, e.data.mode);
}
