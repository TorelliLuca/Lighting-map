import { api } from '../context/UserContext'

/**
 * Client API topologia linee elettriche.
 */

export async function setTopologyParent(childId, parentId) {
  const { data } = await api.patch(`/topology/parent/${childId}`, {
    parent: parentId ?? null,
  })
  return data
}

export async function clearTopologyParent(childId) {
  const { data } = await api.delete(`/topology/parent/${childId}`)
  return data
}

export async function fetchTopologyTree({ townHall, quadro, rootId } = {}) {
  const params = {}
  if (rootId) params.root_id = rootId
  if (townHall) params.town_hall = townHall
  if (quadro != null && quadro !== '') params.quadro = quadro
  const { data } = await api.get('/topology/tree', { params })
  return data
}
