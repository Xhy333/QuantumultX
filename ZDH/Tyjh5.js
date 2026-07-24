



[MITM]
hostname = farmgames.ioutu.cn

[rewrite_local]
https:\/\/farmgames\.ioutu\.cn url script-request-header Tyjh5.js

[task_local]
0 7 * * * Tyjh5.js
