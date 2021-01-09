import { useEffect, useMemo, useRef, useState } from "react";
import isEqual from "lodash/isEqual";
import "reflect-metadata";

import { randStr } from "./utils";

const noopGlobal: Record<string, any> = {};

type Listener<R = any> = (newRootState: R, stateName: keyof R) => void;

interface HSMGlobal<R = any> {
  rootState: R;
  listeners: Record<string, Listener<R>>;
}

function getGlobal<R = any>(): HSMGlobal<R> {
  let global: HSMGlobal<R>;
  if (typeof window === "undefined") {
    global = noopGlobal as any;
  } else {
    global = window as any;
  }
  return global as HSMGlobal<R>;
}

function addListener<R>(listener: Listener<R>) {
  const listenerId = `${randStr(12)}_${new Date().getTime()}`;
  getGlobal<R>().listeners[listenerId] = listener;
  return listenerId;
}

function removeListener<R>(id: string) {
  delete getGlobal<R>().listeners[id];
}

function notifyListener<R>(stateName: keyof R) {
  const listeners = getGlobal<R>().listeners;
  for (const listenerId of Object.keys(listeners)) {
    listeners[listenerId](getGlobal<R>().rootState, stateName);
  }
}

export function mapStates<R = any>(states: R) {
  const global = getGlobal<R>();
  global.listeners = {};
  return function createStore() {
    global.rootState = Object.keys(states).reduce(
      (store: Record<string, any>, stateName: any) => {
        const InstanceClass = (states as any)[stateName] as any;
        store[stateName] = InstanceClass;
        Object.defineProperty(store[stateName], "watchIdentity", {
          value: stateName,
          writable: false,
          enumerable: false
        });

        const listenProperties =
          Reflect.getMetadata("listenProperties", store[stateName]) || [];

        for (const propName of listenProperties) {
          const defaultValue = InstanceClass[propName];
          Object.defineProperty(store[stateName], `_${propName}`, {
            value: defaultValue,
            writable: true
          });

          Object.defineProperty(store[stateName], propName, {
            get: function() {
              return this[`_${propName}`];
            },
            set: function(value: any) {
              this[`_${propName}`] = value;
              notifyListener(stateName as keyof R);
            }
          });
        }
        return store;
      },
      {}
    ) as R;

    return global.rootState;
  };
}

export function listen(target: any, propertyKey: string) {
  const listenProperties =
    Reflect.getMetadata("listenProperties", target) || [];

  Reflect.defineMetadata(
    "listenProperties",
    [...listenProperties, propertyKey],
    target
  );
}

//Check if watch value is a state instead of plan value
function isState<R>(value: any, nameOfStateChange: keyof R) {
  const watchIdentity = value?.watchIdentity;
  return watchIdentity === nameOfStateChange;
}

export function useHSM<R = any>(getState?: (states: R) => any) {
  const global = getGlobal<R>();

  const [, forceReRender] = useState(0);
  const refSelector = useRef<((states: R) => any) | undefined>(getState);
  const value = getState ? getState(global.rootState) : null;
  const refValue = useRef(value);

  const listenerId = useMemo(() => {
    return (
      refSelector.current &&
      addListener<R>(function(newRootState, stateName: keyof R) {
        if (isState<R>(refValue.current, stateName)) {
          forceReRender(s => s + 1);
        } else {
          const newData = refSelector.current!(newRootState);
          if (!isEqual(newData, refValue.current)) {
            forceReRender(s => s + 1);
          }
          refValue.current = newData;
        }
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      listenerId && removeListener<R>(listenerId);
    };
  }, []);

  return {
    watchValue: value,
    states: global.rootState as R
  };
}
