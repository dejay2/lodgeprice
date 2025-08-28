import React from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import LodgifyPayloadGenerator from '@/components/LodgifyPayloadGenerator'

const LodgifyPayloadGeneratorPage: React.FC = () => {
  useDocumentTitle('Lodgify Payload Generator')

  return (
    <div className="container mx-auto px-4 py-8">
      <LodgifyPayloadGenerator />
    </div>
  )
}

export default LodgifyPayloadGeneratorPage