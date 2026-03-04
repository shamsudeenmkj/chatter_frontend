import React from 'react'

const Participants = ({count}) => {
  return (
    <section className='participantsSc'>
        <div className="container">
            <div className="row">
                <div className="participantsCnt">
                    <p className='parCount'>{count}</p>
                    <p>Participants</p>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Participants
