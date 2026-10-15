def product_payload(**overrides):
    payload = {
        "sku": "TEST-001",
        "name": "Test Keyboard",
        "category": "Electronics",
        "price": "999.00",
        "quantity": 10,
        "low_stock_threshold": 5,
    }
    payload.update(overrides)
    return payload


def test_create_and_list_product(client):
    response = client.post(
        "/api/products/",
        json=product_payload(),
    )

    assert response.status_code == 201
    assert response.json()["sku"] == "TEST-001"
    assert response.json()["quantity"] == 10

    listing = client.get("/api/products/")

    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["name"] == "Test Keyboard"


def test_duplicate_sku_returns_conflict(client):
    client.post("/api/products/", json=product_payload())

    response = client.post(
        "/api/products/",
        json=product_payload(name="Another Keyboard"),
    )

    assert response.status_code == 409


def test_update_product(client):
    created = client.post(
        "/api/products/",
        json=product_payload(),
    )
    product_id = created.json()["id"]

    response = client.put(
        f"/api/products/{product_id}",
        json={"quantity": 15, "price": "1099.00"},
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 15
    assert response.json()["price"] == "1099.00"


def test_delete_product(client):
    created = client.post(
        "/api/products/",
        json=product_payload(),
    )
    product_id = created.json()["id"]

    response = client.delete(f"/api/products/{product_id}")

    assert response.status_code == 204
    assert client.get(f"/api/products/{product_id}").status_code == 404


def test_search_by_name(client):
    client.post("/api/products/", json=product_payload())
    client.post(
        "/api/products/",
        json=product_payload(
            sku="TEST-002",
            name="USB-C Hub",
        ),
    )

    response = client.get(
        "/api/products/",
        params={"search": "USB-C"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "USB-C Hub"


def test_low_stock_filter(client):
    client.post(
        "/api/products/",
        json=product_payload(
            sku="TEST-LOW",
            quantity=2,
            low_stock_threshold=5,
        ),
    )
    client.post(
        "/api/products/",
        json=product_payload(
            sku="TEST-OK",
            quantity=10,
            low_stock_threshold=5,
        ),
    )

    response = client.get(
        "/api/products/",
        params={"low_stock": True},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["sku"] == "TEST-LOW"


def test_invalid_product_is_rejected(client):
    response = client.post(
        "/api/products/",
        json=product_payload(price="-10.00"),
    )

    assert response.status_code == 422


def test_missing_product_returns_404(client):
    response = client.get("/api/products/99999")

    assert response.status_code == 404

