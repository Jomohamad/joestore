"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_api-node_src_lib_server_services_logs_ts";
exports.ids = ["_api-node_src_lib_server_services_logs_ts"];
exports.modules = {

/***/ "(api-node)/./src/lib/server/services/logs.ts":
/*!*****************************************!*\
  !*** ./src/lib/server/services/logs.ts ***!
  \*****************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   logsService: () => (/* binding */ logsService)\n/* harmony export */ });\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../supabaseAdmin */ \"(api-node)/./src/lib/server/supabaseAdmin.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__]);\n_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\nconst logsService = {\n    async write (type, message, metadata) {\n        try {\n            const { error } = await _supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__.supabaseAdmin.from('logs').insert({\n                id: (0,crypto__WEBPACK_IMPORTED_MODULE_0__.randomUUID)(),\n                type,\n                message,\n                metadata: metadata || {}\n            });\n            if (error && error.code !== '42P01') {\n                console.error('[logs:insert]', error.message);\n            }\n        } catch (error) {\n            console.error('[logs:insert]', error);\n        }\n    }\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaS1ub2RlKS8uL3NyYy9saWIvc2VydmVyL3NlcnZpY2VzL2xvZ3MudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFvQztBQUNhO0FBRTFDLE1BQU1FLGNBQWM7SUFDekIsTUFBTUMsT0FBTUMsSUFBWSxFQUFFQyxPQUFlLEVBQUVDLFFBQWtDO1FBQzNFLElBQUk7WUFDRixNQUFNLEVBQUVDLEtBQUssRUFBRSxHQUFHLE1BQU1OLHlEQUFhQSxDQUFDTyxJQUFJLENBQUMsUUFBUUMsTUFBTSxDQUFDO2dCQUN4REMsSUFBSVYsa0RBQVVBO2dCQUNkSTtnQkFDQUM7Z0JBQ0FDLFVBQVVBLFlBQVksQ0FBQztZQUN6QjtZQUVBLElBQUlDLFNBQVNBLE1BQU1JLElBQUksS0FBSyxTQUFTO2dCQUNuQ0MsUUFBUUwsS0FBSyxDQUFDLGlCQUFpQkEsTUFBTUYsT0FBTztZQUM5QztRQUNGLEVBQUUsT0FBT0UsT0FBTztZQUNkSyxRQUFRTCxLQUFLLENBQUMsaUJBQWlCQTtRQUNqQztJQUNGO0FBQ0YsRUFBRSIsInNvdXJjZXMiOlsiL3dvcmtzcGFjZXMvam9lc3RvcmUvc3JjL2xpYi9zZXJ2ZXIvc2VydmljZXMvbG9ncy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7IHN1cGFiYXNlQWRtaW4gfSBmcm9tICcuLi9zdXBhYmFzZUFkbWluJztcblxuZXhwb3J0IGNvbnN0IGxvZ3NTZXJ2aWNlID0ge1xuICBhc3luYyB3cml0ZSh0eXBlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmZyb20oJ2xvZ3MnKS5pbnNlcnQoe1xuICAgICAgICBpZDogcmFuZG9tVVVJRCgpLFxuICAgICAgICB0eXBlLFxuICAgICAgICBtZXNzYWdlLFxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGEgfHwge30sXG4gICAgICB9KTtcblxuICAgICAgaWYgKGVycm9yICYmIGVycm9yLmNvZGUgIT09ICc0MlAwMScpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW2xvZ3M6aW5zZXJ0XScsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbbG9nczppbnNlcnRdJywgZXJyb3IpO1xuICAgIH1cbiAgfSxcbn07XG4iXSwibmFtZXMiOlsicmFuZG9tVVVJRCIsInN1cGFiYXNlQWRtaW4iLCJsb2dzU2VydmljZSIsIndyaXRlIiwidHlwZSIsIm1lc3NhZ2UiLCJtZXRhZGF0YSIsImVycm9yIiwiZnJvbSIsImluc2VydCIsImlkIiwiY29kZSIsImNvbnNvbGUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(api-node)/./src/lib/server/services/logs.ts\n");

/***/ })

};
;