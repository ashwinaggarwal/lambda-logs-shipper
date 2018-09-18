import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { readFile, flatmap } from '../../src/common/utils';
import { getFunctionNames, FUNCTIONS_PATH } from '../../src/common/utils/functions';

const cwd = process.cwd();

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH'];

const safeReadAsYaml = async (filePath, defaultYaml = {}) => {
  if (fs.existsSync(filePath)) {
    const data = await readFile(filePath, 'utf8');
    return yaml.safeLoad(data);
  }
  return defaultYaml;
};

const addHttpEventToMethodPreConfig = (preConfig = {}, isHttpMethod) => {
  if (!isHttpMethod) {
    return preConfig;
  }

  const hasHttpEvent = preConfig
    && preConfig.events
    && preConfig.events.filter(event => event.http).length;

  return hasHttpEvent ? preConfig : {
    ...preConfig,
    events: [{ http: {} }].concat(preConfig.events || [])
  };
};

const getEnvironmentForFunctionMethod = async (functionName, method) => {
  const functionMethodEnvPath = path.join(cwd, 'config/environment', process.env.ENV, `${functionName}.yml`);
  const functionEnv = await safeReadAsYaml(functionMethodEnvPath);

  const functionOnlyEnv = Object.keys(functionEnv).reduce((env, key) => {
    if (typeof key !== 'object') {
      env[key] = functionEnv[key];
    }
    return env;
  }, {});

  if (method in functionEnv) {
    return {
      ...functionOnlyEnv,
      ...functionEnv[method]
    };
  }
  return Object.keys(functionOnlyEnv).length ? functionOnlyEnv : undefined;
};

const getFunctionMethodConfig = async (
  functionName,
  functionPreConfig,
  functionSrcPath,
  method
) => {
  const methodName = `${functionName}${method.toUpperCase()}`;
  const isHttpMethod = HTTP_METHODS.indexOf(method.toUpperCase()) !== -1;
  const methodPreConfig = addHttpEventToMethodPreConfig(
    functionPreConfig[methodName], isHttpMethod
  );
  const environment = await getEnvironmentForFunctionMethod(functionName, method);

  return {
    [methodName]: {
      ...methodPreConfig,
      environment,
      handler: `${functionSrcPath}/index.${method}`,
      events: !isHttpMethod
        ? methodPreConfig.events
        : methodPreConfig.events.map(event => (!event.http ? event : {
          ...event,
          http: {
            ...event.http,
            method,
            path: `/${functionName}`
          }
        }))
    }
  };
};

const getFunctionPreConfig = async (functionName) => {
  const functionPreConfigPath = path.join(cwd, 'config/functions', `${functionName}.yml`);
  const functionSpecificConfigRaw = await safeReadAsYaml(functionPreConfigPath, {});
  return functionSpecificConfigRaw;
};

const getFunctionConfig = async (functionName) => {
  const funcPath = path.join(FUNCTIONS_PATH, functionName);
  const func = require(`${funcPath}/index.js`); /* eslint global-require:0 import/no-dynamic-require:0 */
  const funcPreConfig = await getFunctionPreConfig(functionName);
  const funcRelativePath = path.relative(cwd, funcPath);

  const methodsConfig = await Promise.all(Object.keys(func).map(async (funcMethod) => {
    const functMethodConfig = await getFunctionMethodConfig(
      functionName,
      funcPreConfig,
      funcRelativePath,
      funcMethod
    );

    return functMethodConfig;
  }));

  return methodsConfig;
};

export const getFunctionsConfig = async () => {
  const functionNames = getFunctionNames();
  const functionsConfig = await Promise.all(functionNames.map(getFunctionConfig));

  return flatmap(functionsConfig).reduce((config, functionConfig) => ({
    ...config,
    ...functionConfig
  }), {});
};
