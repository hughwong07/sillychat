/**
 * 小傻瓜聊天工具 - Android 移动端入口文件
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// 导入手势处理程序
import 'react-native-gesture-handler';

AppRegistry.registerComponent(appName, () => App);
