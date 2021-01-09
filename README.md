# A state management package for React without use React Context or Redux

## Requirement

If your project use typescript then you need to add options: `emitDecoratorMetadata: true, experimentalDecorators: true` to tsconfig.json.

Else need to install `babel-plugin-transform-decorators-legacy` and follow one of bellow configs:

- .babelrc

```
{
  "presets": ["es2015", "stage-0", "react"],
  "plugins": [
    ["transform-decorators-legacy"],
    // ...
  ]
}
```

- Or Webpack

```
{
  test: /\.jsx?$/,
  loader: 'babel',
  query: {
    cacheDirectory: true,
    plugins: ['transform-decorators-legacy' ],
    presets: ['es2015', 'stage-0', 'react']
  }
}
```

#

## How to use

1. Create folder structure in your `src` folder (if exist) like this:

```
- store
  - index.{ts|js}
  - states
    - test.{ts|js}
```

2. in store/states/test file

- add @listen to which property that you want to trigger store change when it changed

```
import { listen } from "r-hsm";

export default class Test {
  @listen
  counter: number = 0;

  public setCount() {
    this.counter = this.counter + 1;
  }
}

```

3. in store/index file

```
import { mapStates } from "r-hsm";

import Test from "./states/test";

export const createStore = mapStates({
  testState: new Test()
});

// if use typescript
export type RootState = ReturnType<typeof createStore>;

```

4. use in component

```
...
import { createStore, RootState } from "./store";
import { useHSM } from "r-hsm";

createStore();

function App() {
  const { states, watchValue } = useHSM<RootState,number>(
    rootState => rootState.testState.counter
  );

  return (
    <div className="App">
      <header className="App-header">
        <p onClick={()=> states.testState.setCount() }>Click me</p>
       <p>count: {watchValue}</p>
      </header>
    </div>
  );
}

export default App;

```
