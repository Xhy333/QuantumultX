/**************************
 *  * @Author:
 * @LastMod:
 kk键盘
 解锁无限变声功能

仅供学习参考，请于下载后24小时内删除

********************************



使用方法：


单独脚本地址：
https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/ZDH/Kkjp.js

********************************/




^https?:\/\/kk\.weshine\.im\/v1\.0\/text2voice\/(checkCount|consumeCount) url jsonjq-response-body .data.totalCount = 999 | .data.currCount = 999

^https?:\/\/kk\.weshine\.im\/v1\.0\/text2voice\/createTtsAudio url jsonjq-response-body .data.freeCount = 999

hostname = kk.weshine.im