/*名称: 也也步炮茶
 * Author: Xhy333
 * Date: 2024-05-20
 * 使用说明：QuantumultX重写订阅中配置[rewrite_local]和[task_local]
 * qm-user-token值，多账号用@分隔
 * 远程脚本：https://raw.githubusercontent.com/Xhy333/QuantumultX/refs/heads/main/CsWj/Yybpc.js
 ==================================    QX   =================================
 [MITM]
hostname = webapi.qmai.cn

[rewrite_local]
^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center|mall-apiserver) url script-request-header https://raw.githubusercontent.com/Xhy333/QuantumultX/main/CsWj/Yybpc.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/Xhy333/QuantumultX/main/CsWj/Yybpc.js, tag=爷爷不泡茶, enabled=true


 */

