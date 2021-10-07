const ReviewCard = (props) => {
  return (
    <>
      <div className='user-review-card'>
        <img src={props.quote} alt='' className='quote-img' />
        <div className='user-review-card-content'>
          <div className='user-review-card-header'>
            <img src={props.img} alt='' className='user-review-img' />
            <h4 className='user-review-name'>{props.name}</h4>
            <sub className='user-review-occupation'>{props.occupation}</sub>
          </div>
          <p className='user-review-card-text'>{props.review}</p>
        </div>
      </div>
    </>
  );
};

export default ReviewCard;
