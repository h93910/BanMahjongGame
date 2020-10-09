class BanTool {
    copyArr(arr) {
        var out = [],
            i = 0,
            len = arr.length;
        for (; i < len; i++) {
            if (arr[i] instanceof Array) {
                out[i] = this.copyArr(arr[i]);
            } else {
                out[i] = arr[i];
            }
        }
        return out;
    }

    shuffle(arr) {
        for (let i = 0; i < arr.length; i++) {
            let j = Math.floor(Math.random() * (i + 1))
            let t = arr[i]
            arr[i] = arr[j]
            arr[j] = t
        }
        return arr
    }

    randomString(len) {
        len = len || 32;
        var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
        var maxPos = $chars.length;
        var pwd = '';
        for (let i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    }
}

module.exports = BanTool 