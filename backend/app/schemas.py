
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


from typing import Literal


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class ProductUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    price: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )
    quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    category: str
    price: Decimal
    quantity: int
    low_stock_threshold: int
    created_at: datetime

class StockMovementCreate(BaseModel):
    movement_type: Literal["IN", "OUT"]
    quantity: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=250)


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    movement_type: str
    quantity: int
    note: str | None
    created_at: datetime
