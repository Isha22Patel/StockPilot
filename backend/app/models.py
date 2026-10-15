
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    sku: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(150), nullable=False, index=True
    )

    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    low_stock_threshold: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"), nullable=False, index=True
    )

    movement_type: Mapped[str] = mapped_column(
        String(3), nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    note: Mapped[str | None] = mapped_column(
        String(250), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
