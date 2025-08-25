import { io } from 'socket.io-client'
import { useEffect } from 'react'
import { useDroneStore } from '../state/droneStore.js'
import { isFeatureCollection } from './geo.js'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9013'

let socket

export function useSocket(){
  const upsert = useDroneStore(s=>s.upsertFromFeatureCollection)

  useEffect(()=>{
    socket = io(SOCKET_URL, {
      transports: ['polling'], // aligns with server config
      reconnection: true
    })

    function onMessage(payload){
      // payload expected to be a FeatureCollection
      if(isFeatureCollection(payload)){
        upsert(payload)
      }else{
        // Some servers may send stringified JSON
        try{
          const parsed = JSON.parse(payload)
          if(isFeatureCollection(parsed)){
            upsert(parsed)
          }
        }catch(e){
          // ignore non-JSON payloads
        }
      }
    }

    socket.on('connect', ()=> {
      // console.log('socket connected', socket.id)
    })
    socket.on('message', onMessage)
    socket.on('disconnect', ()=>{})

    return ()=> {
      socket?.off('message', onMessage)
      socket?.disconnect()
    }
  }, [upsert])
}