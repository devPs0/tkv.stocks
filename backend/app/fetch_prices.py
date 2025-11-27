import yfinance as yf
from .db import db
from .models import HistoricalPrice
from sqlalchemy.exc import IntegrityError


def fetch_and_store_symbol(symbol, start='2015-01-01', end=None):
    try:
        df = yf.download(symbol, start=start, end=end)
        if df is None or df.empty:
            return 0
        
        count = 0
        for dt, row in df.iterrows():
            # Use .iloc[0] to avoid FutureWarning
            price_data = HistoricalPrice(
                symbol=symbol,
                dt=dt.to_pydatetime(),
                open=float(row['Open'].iloc[0] if hasattr(row['Open'], 'iloc') else row['Open']),
                high=float(row['High'].iloc[0] if hasattr(row['High'], 'iloc') else row['High']),
                low=float(row['Low'].iloc[0] if hasattr(row['Low'], 'iloc') else row['Low']),
                close=float(row['Close'].iloc[0] if hasattr(row['Close'], 'iloc') else row['Close']),
                volume=int(row['Volume'].iloc[0] if hasattr(row['Volume'], 'iloc') else row['Volume']),
                source='yfinance'
            )
            
            try:
                db.session.add(price_data)
                db.session.commit()
                count += 1
            except IntegrityError:
                # Record already exists, skip
                db.session.rollback()
                continue
                
        return count
    except Exception as e:
        db.session.rollback()
        raise e
