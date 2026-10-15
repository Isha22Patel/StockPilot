
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductResponse, ProductUpdate

from app.models import StockMovement
from app.schemas import StockMovementCreate, StockMovementResponse

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/", response_model=list[ProductResponse])
def list_products(
    search: str | None = None,
    category: str | None = None,
    low_stock: bool = False,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    statement = select(Product)

    if search:
        pattern = f"%{search}%"
        statement = statement.where(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
            )
        )

    if category:
        statement = statement.where(Product.category == category)

    if low_stock:
        statement = statement.where(
            Product.quantity <= Product.low_stock_threshold
        )

    statement = statement.order_by(Product.id.desc()).limit(limit)
    return db.scalars(statement).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)

    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A product with this SKU already exists",
        )


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A product with this SKU already exists",
        )


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()


@router.post(
    "/{product_id}/movements",
    response_model=StockMovementResponse,
    status_code=201,
)
def record_stock_movement(
    product_id: int,
    data: StockMovementCreate,
    db: Session = Depends(get_db),
):
    # Lock the product row while updating its stock.
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .with_for_update()
    )

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    if data.movement_type == "OUT" and product.quantity < data.quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient stock for this movement",
        )

    if data.movement_type == "IN":
        product.quantity += data.quantity
    else:
        product.quantity -= data.quantity

    movement = StockMovement(
        product_id=product_id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        note=data.note,
    )

    try:
        db.add(movement)
        db.commit()
        db.refresh(movement)
        return movement
    except Exception:
        db.rollback()
        raise


@router.get(
    "/{product_id}/movements",
    response_model=list[StockMovementResponse],
)
def list_stock_movements(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    statement = (
        select(StockMovement)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.id.desc())
    )

    return db.scalars(statement).all()
