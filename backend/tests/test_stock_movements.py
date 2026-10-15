def create_product(client, quantity=10):
    response = client.post(
        "/api/products/",
        json={
            "sku": "STOCK-001",
            "name": "Test Mouse",
            "category": "Electronics",
            "price": "799.00",
            "quantity": quantity,
            "low_stock_threshold": 5,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_stock_in_increases_quantity(client):
    product_id = create_product(client, quantity=10)

    response = client.post(
        f"/api/products/{product_id}/movements",
        json={
            "movement_type": "IN",
            "quantity": 5,
            "note": "Supplier delivery",
        },
    )

    assert response.status_code == 201
    assert response.json()["movement_type"] == "IN"
    assert response.json()["quantity"] == 5

    product = client.get(f"/api/products/{product_id}").json()
    assert product["quantity"] == 15


def test_stock_out_decreases_quantity(client):
    product_id = create_product(client, quantity=10)

    response = client.post(
        f"/api/products/{product_id}/movements",
        json={
            "movement_type": "OUT",
            "quantity": 3,
            "note": "Customer order",
        },
    )

    assert response.status_code == 201

    product = client.get(f"/api/products/{product_id}").json()
    assert product["quantity"] == 7


def test_stock_out_cannot_exceed_available_quantity(client):
    product_id = create_product(client, quantity=4)

    response = client.post(
        f"/api/products/{product_id}/movements",
        json={
            "movement_type": "OUT",
            "quantity": 5,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Insufficient stock for this movement"
    )

    product = client.get(f"/api/products/{product_id}").json()
    assert product["quantity"] == 4


def test_movement_history(client):
    product_id = create_product(client, quantity=10)

    client.post(
        f"/api/products/{product_id}/movements",
        json={
            "movement_type": "IN",
            "quantity": 2,
            "note": "Restock",
        },
    )

    response = client.get(
        f"/api/products/{product_id}/movements"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["note"] == "Restock"


def test_zero_movement_quantity_is_rejected(client):
    product_id = create_product(client)

    response = client.post(
        f"/api/products/{product_id}/movements",
        json={
            "movement_type": "IN",
            "quantity": 0,
        },
    )

    assert response.status_code == 422
