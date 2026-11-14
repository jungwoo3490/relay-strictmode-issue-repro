import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RelayEnvironmentProvider, graphql, useLazyLoadQuery } from 'react-relay'
import { Environment, Network, Observable, RecordSource, Store } from 'relay-runtime'

const params = new URLSearchParams(location.search)
const fetchPolicy = params.get('policy') ?? 'network-only'
const strict = params.get('strict') !== '0'

let requestCount = 0
const countEl = document.getElementById('count')

const network = Network.create((request, variables) => {
  requestCount += 1
  countEl.textContent = String(requestCount)
  console.count(request.name)
  return Observable.create((sink) => {
    const timer = setTimeout(() => {
      sink.next({ data: { node: { __typename: 'Item', id: variables.id, name: 'Item ' + variables.id } } })
      sink.complete()
    }, 10)
    return () => clearTimeout(timer)
  })
})

const environment = new Environment({ network, store: new Store(new RecordSource()) })

function Screen({ id }) {
  const data = useLazyLoadQuery(
    graphql`
      query mainScreenQuery($id: ID!) {
        node(id: $id) {
          id
          ... on Item {
            name
          }
        }
      }
    `,
    { id },
    { fetchPolicy },
  )
  return <p>Loaded: {data.node?.name}</p>
}

const app = (
  <RelayEnvironmentProvider environment={environment}>
    <p>
      fetchPolicy: <code>{fetchPolicy}</code>, StrictMode: <code>{String(strict)}</code>
    </p>
    <Suspense fallback={<p>Loading...</p>}>
      <Screen id="1" />
    </Suspense>
  </RelayEnvironmentProvider>
)

createRoot(document.getElementById('root')).render(strict ? <StrictMode>{app}</StrictMode> : app)
