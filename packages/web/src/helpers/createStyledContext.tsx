import {
  createContext,
  useContext,
  useMemo,
  type Context,
  type ProviderExoticComponent,
  type ReactNode,
} from 'react'

import { objectIdentityKey } from './objectIdentityKey'

export type StyledContext<Props extends Object = any> = Omit<
  Context<Props>,
  'Provider'
> & {
  context: Context<Props>
  props: Object | undefined
  Provider: ProviderExoticComponent<
    Partial<Props | undefined> & {
      children?: ReactNode
      scope?: string
    }
  >
  useStyledContext: (scope?: string) => Props
}

export function createStyledContext<VariantProps extends Record<string, any>>(
  defaultValues?: VariantProps
): StyledContext<VariantProps> {
  const OGContext = createContext<VariantProps | undefined>(defaultValues)
  const OGProvider = OGContext.Provider
  const Context = OGContext as any as StyledContext<VariantProps>
  const scopedContexts = new Map<string, Context<VariantProps | undefined>>()

  const Provider = ({
    children,
    scope,
    ...values
  }: VariantProps & { children?: ReactNode; scope: string }) => {
    const next = useMemo(() => {
      return {
        // this ! is a workaround for ts error
        ...defaultValues!,
        ...values,
      }
    }, [objectIdentityKey(values)])
    let Provider = OGProvider
    if (scope) {
      let ScopedContext = scopedContexts.get(scope)
      if (!ScopedContext) {
        ScopedContext = createContext<VariantProps | undefined>(defaultValues)
        scopedContexts.set(scope, ScopedContext)
      }
      Provider = ScopedContext.Provider
    }
    return <Provider value={next}>{children}</Provider>
  }

  // use consumerComponent just to give a better error message
  const useStyledContext = (scope?: string) => {
    const context = scope ? scopedContexts.get(scope) : OGContext
    return useContext(context!) as VariantProps
  }

  // @ts-ignore
  Context.Provider = Provider
  Context.props = defaultValues
  Context.context = OGContext as Context<VariantProps>
  Context.useStyledContext = useStyledContext

  return Context
}

export type ScopedProps<P, K extends string> = P & { [Key in `__scope${K}`]?: string }
