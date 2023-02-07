import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.min";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
// import fragment from "../shader/fragment.glsl";
// import vertex from "../shader/vertex.glsl";

export class Sketch {
    constructor(options) {
        this.mouse = new THREE.Vector2(0, 0);
        this.camera = null;
        this.raycaster = new THREE.Raycaster();
        this.INTERSECTED = null;
        this.color_bg = 0x293041;
        // this.color_bg = 0x5955e0;
        this.color_fg = 0xffffff;
        this.color_highlight = 0x77c0e7;
        this.camera_type = 1; // 1 =  perspective, 2 = ortographic
        this.destroyed = false;
        this.sliderValue = 0;
        this.scene = new THREE.Scene();
        this.container = options.dom;
        this.meshes = [];
        this.textures = [];
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.aspect = this.width / this.height;
        this.scrollY = 0;
        this.scrollTargetY = 0;
        this.currentScrollY = 0;
        this.scrollX = 0;
        this.scrollTargetX = 0;
        this.currentScrollX = 0;
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.gridrows = 7;
        this.gridcols = 20;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(this.color_bg, 1);
        this.renderer.physicallyCorrectLights = true;
        // if the outputEncoding is set, the texture encoding should be
        // set as well for every texture.
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.test_settings = undefined;
        this.container.appendChild(this.renderer.domElement);

        // image and grid properties
        this.image_urls = [];
        this.n_images = this.gridcols * this.gridrows;
        this.margin_w = 0.1;
        this.margin_h = 0.1;
        this.image_w = 1.0;
        this.image_h = 4.0 / 4.0;
        this.showing_grid = true;
        this.alpha_grid = { value: 1.0 };
        this.time = 0;
        // Setup
        this.setupCamera();
        this.setupListeners();
        this.setupImageURLs();
        this.setupObjects();
        // Start render loop
        this.isPlaying = false;
        this.onResize();
        this.render();
    }

    /***************************************************************************
     * Setup
     ***************************************************************************/
    setupCamera() {
        // Setup Camera
        if (this.camera_type == 1) {
            this.camera = new THREE.PerspectiveCamera(
                70,
                window.innerWidth / window.innerHeight,
                0.001,
                1000,
            );
        } else {
            this.frustumSize = 3;
            this.camera = new THREE.OrthographicCamera(
                (this.frustumSize * this.aspect) / -2,
                (this.frustumSize * this.aspect) / 2,
                this.frustumSize / 2,
                this.frustumSize / -2,
                -1000,
                1000,
            );
        }
        this.camera.position.set(0, 0, 20);
    }

    setupListeners() {
        this.on_resize_bound = this.onResize.bind(this);
        this.on_wheel_bound = this.onWheel.bind(this);
        this.on_mouse_down_bound = this.onMouseDown.bind(this);
        this.on_mouse_move_bound = this.onMouseMove.bind(this);
        this.on_touch_start_bound = this.onTouchStart.bind(this);
        this.on_touch_move_bound = this.onTouchMove.bind(this);
        this.on_touch_end_bound = this.onTouchEnd.bind(this);
        window.addEventListener("resize", this.on_resize_bound);
        this.container.addEventListener("wheel", this.on_wheel_bound, false);
        this.container.addEventListener("mousedown", this.on_mouse_down_bound, false);
        this.container.addEventListener("mousemove", this.on_mouse_move_bound, false);
        this.container.addEventListerer("touchstart", this.on_touch_start_bound, false);
        this.container.addEventListener("touchmove", this.on_touch_move_bound, false);
        this.container.addEventListener("touchend", this.on_touch_end_bound, false);
    }

    setupImageURLs() {
        for (let i = 0; i < 67; i++) {
            let url = "./assets/images_but/" + this.zeroPad(i + 1, 4) + ".jpg";
            this.image_urls.push(url);
        }
        this.shuffleArray(this.image_urls);
    }


    setupObjects() {
        this.geometry = new THREE.PlaneGeometry(
            this.image_w,
            this.image_h,
            1,
            1,
        );
        // Create list of textures
        for (let i = 0; i < 67; i++) {
            let url = "./assets/images_but/" + this.zeroPad(i + 1, 4) + ".jpg";
            this.textures.push(new THREE.ImageLoader().load(url));
            this.textures[i].encoding = THREE.sRGBEncoding;
        }
        console.log(this.textures);
        // Assign textures to objects
        for (let i = 0; i < this.n_images; i++) {
            let mesh = new THREE.Mesh(
                this.geometry,
                new THREE.MeshBasicMaterial({
                    map: this.textures[i % this.textures.length],
                    transparent: true,
                    opacity: 1.0,
                }),
            );
            this.meshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    /***************************************************************************
     * Update functions
     ***************************************************************************/
    updateMeshes() {
        const wholeWidth = (1 / this.gridrows) * this.n_images * this.image_w;
        const wholeHeight = this.gridrows * this.image_h;

        for (let xi = 0; xi < this.n_images / this.gridrows; xi++) {
            for (let yi = 0; yi < this.gridrows; yi++) {
                const ki = this.gridrows * xi + yi;
                const xpos =
                    -this.n_images / this.gridrows / 2 +
                    ((xi * this.image_w +
                        this.currentScrollX +
                        10e6 * wholeWidth) %
                        wholeWidth);
                const ypos =
                    Math.floor(this.gridrows / 2) * this.image_h +
                    this.image_h / 2 -
                    ((yi * this.image_h +
                        this.currentScrollY +
                        1e6 * wholeHeight) %
                        wholeHeight);
                // const zpos = -0.5 + (ki % 3) * 0.5;
                // const ypos =
                //     Math.floor(this.gridrows / 2) * this.image_h -
                //     yi * this.image_h;
                this.meshes[ki].position.x = xpos;
                this.meshes[ki].position.y = ypos;
                // this.meshes[ki].position.z = zpos;
            }
        }
    }

    updateRaycaster() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        let intersects = this.raycaster.intersectObjects(this.scene.children);
        if (intersects.length > 0) {
            console.log("n_intersects: " + intersects.length);
            let first_selectable_object = -1;
            for (let i = 0; i < intersects.length; i++) {
                first_selectable_object = i;
            }
            if (
                first_selectable_object > -1 &&
                this.INTERSECTED !==
                    intersects[first_selectable_object].object &&
                intersects[first_selectable_object].object.isMesh === true
            ) {
                // if (this.INTERSECTED) {
                //     this.INTERSECTED.material.color.setHex( this.INTERSECTED.currentHex,);
                // }
                if (this.INTERSECTED) {
                    new TWEEN.Tween(this.INTERSECTED.position)
                        .to({ z: 0.0 }, 500)
                        .easing(TWEEN.Easing.Sinusoidal.InOut)
                        .start();
                }
                this.INTERSECTED = intersects[first_selectable_object].object;
                new TWEEN.Tween(this.INTERSECTED.position)
                    .to({ z: 0.1 }, 500)
                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                    .start();
                // this.INTERSECTED.currentHex = this.INTERSECTED.material.color.getHex();
                // this.INTERSECTED.material.color.setHex(this.color_highlight);
            }
        } else {
            if (this.INTERSECTED) {
                // this.INTERSECTED.material.color.setHex(
                //     this.INTERSECTED.currentHex,
                // );
                new TWEEN.Tween(this.INTERSECTED.position)
                    .to({ z: 0.0 }, 500)
                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                    .start();
            }
            this.INTERSECTED = null;
        }
    }

    gotoObject() {
        if (this.showing_grid) {
            // Go to object
            if (this.INTERSECTED !== null) {
                this.INTERSECTED.entity_id;
                // Store the current camera position and orientation.
                const start_camera_position = this.camera.position.clone();
                const start_camera_rotation = new THREE.Euler().copy(
                    this.camera.rotation,
                );
                const end_camera_position = new THREE.Vector3(
                    this.INTERSECTED.position.x,
                    this.INTERSECTED.position.y,
                    0.65,
                );
                // Set the camera to its end position and orientation to compute the final lookAt angles.
                this.camera.position.copy(end_camera_position);
                this.camera.lookAt(this.INTERSECTED.position);
                const end_camera_rotation = new THREE.Euler().copy(
                    this.camera.rotation,
                );
                // Revert camera to its original position and angle.
                this.camera.position.copy(start_camera_position);
                this.camera.rotation.copy(start_camera_rotation);
                // Start the tween.
                this.tweenCameraToPosition(
                    end_camera_position,
                    end_camera_rotation,
                    0.0,
                );
            }
        } else {
            // Go to origin
            this.tweenCameraToPosition(
                new THREE.Vector3(0, 0, 2),
                new THREE.Vector3(0, 0, 0),
                1.0,
            );
        }
        this.showing_grid = !this.showing_grid;
    }

    tweenCameraToPosition(position, rotation, opacity) {
        const duration = 500;
        new TWEEN.Tween(this.camera.position)
            .to({ x: position.x, y: position.y, z: position.z }, 500)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .start();
        new TWEEN.Tween(this.camera.rotation)
            .to({ x: rotation.x, y: rotation.y, z: rotation.z }, 500)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .start();
        new TWEEN.Tween(this.alpha_grid)
            .to({ value: opacity }, 500)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .start();
    }

    destroy() {
        this.renderer.dispose();
        this.camera = undefined;
        window.addEventListener("resize", this.on_resize_bound);
        document.removeEventListener("wheel", this.on_wheel_bound, false);
        document.removeEventListener("mousedown", this.on_mouse_down_bound, false);
        document.removeEventListener("mousemove", this.on_mouse_move_bound, false);
        this.destroyed = true;
    }

    /***************************************************************************
     * Event handlers
     ***************************************************************************/
    onResize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.aspect = this.width / this.height;
        this.camera.aspect = this.aspect;
        // For orthographic cameras
        if (this.camera_type == 2) {
            this.camera.left = (this.frustumSize * this.aspect) / -2;
            this.camera.right = (this.frustumSize * this.aspect) / 2;
            this.camera.top = this.frustumSize / 2;
            this.camera.bottom = this.frustumSize / -2;
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    onWheel(event) {
        // event.preventDefault();
        this.scrollTargetWheel = event.wheelDelta * 0.1;
    }

    onMouseDown(event) {
        // this.updateRaycaster();
        this.gotoObject();
    }

    onMouseMove(event) {
        event.preventDefault();
        this.mouse.x = (event.clientX / this.width) * 2 - 1;
        this.mouse.y = -(event.clientY / this.height) * 2 + 1;
        this.scrollTargetX = -this.mouse.x;
        this.scrollTargetY = this.mouse.y;
    }

    onTouchStart(event) {
        event.preventDefault();
    }

    onTouchMove(event) {
        event.preventDefault();
    }

    onTouchEnd(event) {
        event.preventDefault();
    }


    /***************************************************************************
     * Render loop
     ***************************************************************************/
    render() {
        if (!this.isPlaying) return;
        //
        TWEEN.update();
        // See if there are tiles 'hovered' on.
        this.camera.updateMatrixWorld();
        this.updateRaycaster();
        // Set opacity for all objects, except for the selected one, if applicable.
        this.meshes.forEach((mesh) => {
            mesh.material.opacity = this.alpha_grid.value;
        });
        if (this.INTERSECTED !== null && this.showing_grid == false) {
            this.INTERSECTED.material.opacity = 1.0;
        }
        // When showing the grid, do the scrolling and camera rotation 
        // with the mouse pointer.
        if (this.showing_grid) {
            this.scrollX += (this.scrollTargetX - this.scrollX) * 0.2;
            this.scrollY += (this.scrollTargetY - this.scrollY) * 0.2;
            // this.scroll *= 0.9;
            // this.scrollTarget *= 0.9;
            this.currentScrollX += this.scrollX * 0.01;
            this.currentScrollY += this.scrollY * 0.01;
            // Change position of the objects depending on the scroll.
            this.updateMeshes();
            this.camera.rotation.x = Math.sin(this.mouse.y) * 0.1;
            this.camera.rotation.y = -Math.sin(this.mouse.x) * 0.1;
        }

        requestAnimationFrame(this.render.bind(this));
        // render the scene and display on screen
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
    }

    stop() {
        this.isPlaying = false;
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.render();
        }
    }

    /***************************************************************************
     * Helper functions
     ***************************************************************************/

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    zeroPad = (num, places) => String(num).padStart(places, "0");
}
