package expo.modules.floatingbubble

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

private const val BRAND = 0xFFFF5A1F.toInt()
private const val GREEN = 0xFF10B981.toInt()
private const val BG_PANEL = 0xF518181B.toInt()
private const val BG_CARD = 0xFF27272A.toInt()
private const val BORDER_LIGHT = 0x2AFFFFFF.toInt()
private const val HEAD_DP = 56
private const val PANEL_WIDTH_DP = 330
private const val MAX_SCROLL_HEIGHT_DP = 340

/**
 * A draggable floating bubble drawn over other apps.
 *
 * - When tapped: Expands a floating card with delivery requests, active trip info,
 *   and online status right on screen — instead of immediately navigating to the app.
 * - When a new request arrives: The request automatically pops up on this list.
 * - Tapping "View" on an offer or "Open App" brings the app to the front.
 */
@SuppressLint("ViewConstructor", "ClickableViewAccessibility")
internal class BubbleView(
  private val context: Context,
  private val onTap: (deepLink: String) -> Unit,
) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val density = context.resources.displayMetrics.density
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

  private var isExpanded = false
  private var attached = false
  private var pulse: ObjectAnimator? = null
  private var defaultDeepLink = "logisticsdriverapp://home"
  private var lastCollapsedX = 0

  // ─── Head Views (Circular Draggable Bubble) ──────────────────────────

  private val ring = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(Color.WHITE)
    setStroke(dp(3), BRAND)
  }

  private val head = FrameLayout(context).apply {
    background = ring
    elevation = dp(6).toFloat()
    val icon = ImageView(context).apply {
      setImageDrawable(context.packageManager.getApplicationIcon(context.packageName))
      scaleType = ImageView.ScaleType.CENTER_CROP
      clipToOutline = true
      outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
      background = GradientDrawable().apply { shape = GradientDrawable.OVAL }
    }
    addView(icon, FrameLayout.LayoutParams(dp(HEAD_DP - 10), dp(HEAD_DP - 10), Gravity.CENTER))
  }

  // ─── Collapsed Status Pill ──────────────────────────────────────────

  private val pillTitle = TextView(context).apply {
    setTextColor(Color.WHITE)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
    typeface = Typeface.DEFAULT_BOLD
    maxLines = 1
    ellipsize = TextUtils.TruncateAt.END
  }

  private val pillSubtitle = TextView(context).apply {
    setTextColor(0xCCFFFFFF.toInt())
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
    maxLines = 1
    ellipsize = TextUtils.TruncateAt.END
  }

  private val collapsedPill = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(10), dp(4), dp(10), dp(5))
    background = roundRect(0xEE18181B.toInt(), dp(12).toFloat(), dp(1), BORDER_LIGHT)
    elevation = dp(4).toFloat()
    addView(pillTitle)
    addView(pillSubtitle)
  }

  private val headRow = LinearLayout(context).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    addView(head, LinearLayout.LayoutParams(dp(HEAD_DP), dp(HEAD_DP)))
    addView(
      collapsedPill,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { leftMargin = dp(6) },
    )
  }

  // ─── Expanded Card / List Panel ─────────────────────────────────────

  private val contentList = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.START
  }

  private class MaxHeightScrollView(context: Context, private val maxHeightPx: Int) : ScrollView(context) {
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
      val newHeightSpec = MeasureSpec.makeMeasureSpec(maxHeightPx, MeasureSpec.AT_MOST)
      super.onMeasure(widthMeasureSpec, newHeightSpec)
    }
  }

  private val scrollView = MaxHeightScrollView(context, dp(MAX_SCROLL_HEIGHT_DP)).apply {
    isVerticalScrollBarEnabled = false
    addView(
      contentList,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
      ),
    )
  }

  private val panel = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    visibility = View.GONE
    setPadding(dp(14), dp(12), dp(14), dp(12))
    background = roundRect(BG_PANEL, dp(18).toFloat(), dp(1), BORDER_LIGHT)
    elevation = dp(10).toFloat()

    // Panel Header: RYNO Title + Online Badge + Close Button
    val panelHeader = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, 0, 0, dp(8))

      val brandTitle = TextView(context).apply {
        text = "RYNO Partner"
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        typeface = Typeface.DEFAULT_BOLD
      }
      addView(brandTitle)

      val onlineBadge = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(6), dp(2), dp(6), dp(2))
        background = roundRect(0x2010B981.toInt(), dp(10).toFloat(), dp(1), 0x5010B981.toInt())
        val dot = View(context).apply {
          background = circle(GREEN)
        }
        addView(dot, LinearLayout.LayoutParams(dp(6), dp(6)))
        val badgeText = TextView(context).apply {
          text = "ONLINE"
          setTextColor(GREEN)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
          typeface = Typeface.DEFAULT_BOLD
          setPadding(dp(4), 0, 0, 0)
        }
        addView(badgeText)
      }
      addView(
        onlineBadge,
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.WRAP_CONTENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { leftMargin = dp(8) },
      )

      val spacer = View(context)
      addView(spacer, LinearLayout.LayoutParams(0, 0, 1f))

      val closeBtn = TextView(context).apply {
        text = "✕"
        setTextColor(0xFFA1A1AA.toInt())
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
        gravity = Gravity.CENTER
        background = circle(0xFF333336.toInt())
        setOnClickListener { collapse() }
      }
      addView(closeBtn, LinearLayout.LayoutParams(dp(26), dp(26)))
    }
    addView(panelHeader)

    // Scrollable requests / job list
    addView(
      scrollView,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ),
    )

    // Panel Footer: Open full app button
    val panelFooter = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(10), 0, 0)

      val openAppBtn = TextView(context).apply {
        text = "Open RYNO App ↗"
        setTextColor(0xEEFFFFFF.toInt())
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        typeface = Typeface.DEFAULT_BOLD
        setPadding(dp(14), dp(7), dp(14), dp(7))
        background = roundRect(0xFF2C2C30.toInt(), dp(12).toFloat(), dp(1), 0x30FFFFFF.toInt())
        setOnClickListener {
          onTap(defaultDeepLink)
        }
      }
      addView(openAppBtn)
    }
    addView(panelFooter)
  }

  private val root = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.START
    setPadding(dp(6), dp(6), dp(6), dp(6))
    addView(headRow)
    addView(
      panel,
      LinearLayout.LayoutParams(dp(PANEL_WIDTH_DP), LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        topMargin = dp(6)
      },
    )
    contentDescription = "RYNO Partner floating overlay"
  }

  private val params = WindowManager.LayoutParams(
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.WRAP_CONTENT,
    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
      WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
    PixelFormat.TRANSLUCENT,
  ).apply {
    gravity = Gravity.TOP or Gravity.START
    x = 0
    y = (context.resources.displayMetrics.heightPixels * 0.3).toInt()
  }

  init {
    pillTitle.maxWidth = dp(140)
    pillSubtitle.maxWidth = dp(140)
    head.setOnTouchListener(DragListener())
    collapsedPill.setOnClickListener { toggleExpanded() }
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /** Legacy single-string update, maintained for backwards compatibility. */
  fun updateLegacy(titleText: String, subtitleText: String, link: String, highlight: Boolean) {
    defaultDeepLink = link
    pillTitle.text = titleText
    pillSubtitle.text = subtitleText
    pillSubtitle.visibility = if (subtitleText.isEmpty()) View.GONE else View.VISIBLE
    ring.setStroke(dp(if (highlight) 4 else 3), if (highlight) BRAND else 0xFFE5E5E5.toInt())
    setPulsing(highlight)
    renderIdleState(titleText, subtitleText)
  }

  /** Full rich update containing multiple offers, active job, and status. */
  fun updateData(jsonString: String) {
    try {
      val json = JSONObject(jsonString)
      val summaryTitle = json.optString("summaryTitle", "You're online")
      val summarySubtitle = json.optString("summarySubtitle", "Finding requests")
      defaultDeepLink = json.optString("defaultDeepLink", "logisticsdriverapp://home")
      val highlight = json.optBoolean("highlight", false)
      val autoExpand = json.optBoolean("autoExpand", false)

      pillTitle.text = summaryTitle
      pillSubtitle.text = summarySubtitle
      pillSubtitle.visibility = if (summarySubtitle.isEmpty()) View.GONE else View.VISIBLE
      ring.setStroke(dp(if (highlight) 4 else 3), if (highlight) BRAND else 0xFFE5E5E5.toInt())
      setPulsing(highlight)

      val offersArray = json.optJSONArray("offers") ?: JSONArray()
      val activeJobObj = json.optJSONObject("activeJob")

      rebuildListContent(offersArray, activeJobObj, summaryTitle, summarySubtitle)

      // When a new request arrives, auto-expand the list right on screen
      if (autoExpand) {
        expand()
      }
    } catch (_: Exception) {
      // Fallback gracefully on parsing issues
    }
  }

  fun attach() {
    if (attached) return
    windowManager.addView(root, params)
    attached = true
  }

  fun detach() {
    if (!attached) return
    setPulsing(false)
    windowManager.removeView(root)
    attached = false
  }

  // ─── Expand / Collapse UI Behavior ──────────────────────────────────

  private fun toggleExpanded() {
    if (isExpanded) collapse() else expand()
  }

  private fun expand() {
    if (isExpanded) return
    isExpanded = true
    panel.visibility = View.VISIBLE
    collapsedPill.visibility = View.GONE

    val screenWidth = context.resources.displayMetrics.widthPixels
    val screenHeight = context.resources.displayMetrics.heightPixels
    val panelWidth = min(dp(PANEL_WIDTH_DP), screenWidth - dp(24))

    lastCollapsedX = params.x
    // If the bubble is on the left side, align panel to left margin
    if (lastCollapsedX + dp(HEAD_DP) / 2 < screenWidth / 2) {
      params.x = dp(12)
    } else {
      // If on the right side, align panel so it remains fully inside the right edge
      params.x = max(dp(12), screenWidth - panelWidth - dp(12))
    }

    // Keep panel within screen bounds vertically
    val maxY = screenHeight - dp(MAX_SCROLL_HEIGHT_DP + 100)
    if (params.y > maxY) {
      params.y = maxY.coerceAtLeast(dp(30))
    }

    if (attached) {
      windowManager.updateViewLayout(root, params)
    }
  }

  private fun collapse() {
    if (!isExpanded) return
    isExpanded = false
    panel.visibility = View.GONE
    collapsedPill.visibility = View.VISIBLE

    // Snap back to nearest screen edge
    snapToEdge()
  }

  // ─── Rendering List Content ─────────────────────────────────────────

  private fun rebuildListContent(
    offers: JSONArray,
    activeJob: JSONObject?,
    summaryTitle: String,
    summarySubtitle: String,
  ) {
    contentList.removeAllViews()

    var hasItems = false

    // 1. Delivery Requests / Popups section
    if (offers.length() > 0) {
      hasItems = true
      val sectionHeader = TextView(context).apply {
        text = "⚡ NEW DELIVERY REQUESTS (${offers.length()})"
        setTextColor(BRAND)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        typeface = Typeface.DEFAULT_BOLD
        setPadding(0, dp(4), 0, dp(6))
      }
      contentList.addView(sectionHeader)

      for (i in 0 until offers.length()) {
        val offer = offers.optJSONObject(i) ?: continue
        val card = buildOfferCard(offer)
        contentList.addView(card)
      }
    }

    // 2. Active Job section
    if (activeJob != null) {
      hasItems = true
      val jobHeader = TextView(context).apply {
        text = "📦 CURRENT DELIVERY"
        setTextColor(0xFF38BDF8.toInt()) // Sky blue
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        typeface = Typeface.DEFAULT_BOLD
        setPadding(0, dp(6), 0, dp(6))
      }
      contentList.addView(jobHeader)
      contentList.addView(buildJobCard(activeJob))
    }

    // 3. Idle / Searching state
    if (!hasItems) {
      renderIdleState(summaryTitle, summarySubtitle)
    }
  }

  private fun renderIdleState(title: String, subtitle: String) {
    contentList.removeAllViews()
    val idleCard = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(16), dp(20), dp(16), dp(20))
      background = roundRect(BG_CARD, dp(14).toFloat(), dp(1), BORDER_LIGHT)

      val dot = View(context).apply {
        background = circle(GREEN)
      }
      addView(dot, LinearLayout.LayoutParams(dp(10), dp(10)))

      val titleView = TextView(context).apply {
        text = title.ifEmpty { "Looking for deliveries near you…" }
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setPadding(0, dp(8), 0, dp(2))
      }
      addView(titleView)

      val subtitleView = TextView(context).apply {
        text = subtitle.ifEmpty { "Keep navigating. New requests will appear right on this list." }
        setTextColor(0xFFA1A1AA.toInt())
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        gravity = Gravity.CENTER
      }
      addView(subtitleView)
    }
    contentList.addView(idleCard)
  }

  private fun buildOfferCard(offer: JSONObject): View {
    val deepLink = offer.optString("deepLink", defaultDeepLink)
    val earning = offer.optString("earning", "")
    val vehicleName = offer.optString("vehicleName", "Delivery")
    val orderNumber = offer.optString("orderNumber", "")
    val pickupAddress = offer.optString("pickupAddress", "")
    val dropAddress = offer.optString("dropAddress", "")
    val pickupDistance = offer.optString("pickupDistance", "")
    val tripDistance = offer.optString("tripDistance", "")

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(12), dp(10), dp(12), dp(10))
      background = roundRect(BG_CARD, dp(14).toFloat(), dp(1), 0x40FF5A1F.toInt())
      setOnClickListener { onTap(deepLink) }

      // Top Row: Vehicle name & Order # | Earning
      val topRow = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL

        val infoCol = LinearLayout(context).apply {
          orientation = LinearLayout.VERTICAL
          val titleText = TextView(context).apply {
            text = "$vehicleName · #$orderNumber"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            typeface = Typeface.DEFAULT_BOLD
          }
          addView(titleText)
          if (pickupDistance.isNotEmpty()) {
            val distText = TextView(context).apply {
              text = pickupDistance
              setTextColor(0xFFA1A1AA.toInt())
              setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            }
            addView(distText)
          }
        }
        addView(infoCol, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        val earningText = TextView(context).apply {
          text = earning
          setTextColor(BRAND)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
          typeface = Typeface.DEFAULT_BOLD
        }
        addView(earningText)
      }
      addView(topRow)

      // Route: Pickup & Drop
      val routeContainer = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, dp(8), 0, dp(8))

        // Pickup
        val pickupRow = LinearLayout(context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
          val dot = View(context).apply { background = circle(GREEN) }
          addView(dot, LinearLayout.LayoutParams(dp(8), dp(8)))
          val label = TextView(context).apply {
            text = pickupAddress
            setTextColor(0xEEFFFFFF.toInt())
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            setPadding(dp(6), 0, 0, 0)
          }
          addView(label)
        }
        addView(pickupRow)

        // Drop
        val dropRow = LinearLayout(context).apply {
          orientation = LinearLayout.HORIZONTAL
          gravity = Gravity.CENTER_VERTICAL
          setPadding(0, dp(4), 0, 0)
          val dot = View(context).apply { background = circle(BRAND) }
          addView(dot, LinearLayout.LayoutParams(dp(8), dp(8)))
          val label = TextView(context).apply {
            text = dropAddress
            setTextColor(0xEEFFFFFF.toInt())
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            setPadding(dp(6), 0, 0, 0)
          }
          addView(label)
        }
        addView(dropRow)
      }
      addView(routeContainer)

      // Action row: Trip distance & "View & Accept" button
      val actionRow = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(0, dp(2), 0, 0)

        if (tripDistance.isNotEmpty()) {
          val distText = TextView(context).apply {
            text = tripDistance
            setTextColor(0xFFA1A1AA.toInt())
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
          }
          addView(distText, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        } else {
          val spacer = View(context)
          addView(spacer, LinearLayout.LayoutParams(0, 0, 1f))
        }

        val viewBtn = TextView(context).apply {
          text = "View & Accept"
          setTextColor(Color.WHITE)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
          typeface = Typeface.DEFAULT_BOLD
          setPadding(dp(12), dp(6), dp(12), dp(6))
          background = roundRect(BRAND, dp(10).toFloat())
          setOnClickListener { onTap(deepLink) }
        }
        addView(viewBtn)
      }
      addView(actionRow)
    }

    return LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(0, 0, 0, dp(8))
      addView(card)
    }
  }

  private fun buildJobCard(job: JSONObject): View {
    val deepLink = job.optString("deepLink", "${defaultDeepLink}active-delivery")
    val stageTitle = job.optString("stageTitle", "On a trip")
    val targetAddress = job.optString("targetAddress", "")
    val orderNumber = job.optString("orderNumber", "")

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(12), dp(10), dp(12), dp(10))
      background = roundRect(BG_CARD, dp(14).toFloat(), dp(1), 0x4038BDF8.toInt())
      setOnClickListener { onTap(deepLink) }

      val title = TextView(context).apply {
        text = if (orderNumber.isNotEmpty()) "$stageTitle · #$orderNumber" else stageTitle
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
        typeface = Typeface.DEFAULT_BOLD
      }
      addView(title)

      if (targetAddress.isNotEmpty()) {
        val dest = TextView(context).apply {
          text = targetAddress
          setTextColor(0xCCFFFFFF.toInt())
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
          maxLines = 1
          ellipsize = TextUtils.TruncateAt.END
          setPadding(0, dp(3), 0, 0)
        }
        addView(dest)
      }

      val actionBtn = TextView(context).apply {
        text = "Open Active Trip"
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        typeface = Typeface.DEFAULT_BOLD
        setPadding(dp(10), dp(5), dp(10), dp(5))
        background = roundRect(0xFF0284C7.toInt(), dp(8).toFloat())
        setOnClickListener { onTap(deepLink) }
      }
      addView(
        actionBtn,
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.WRAP_CONTENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(6) },
      )
    }

    return LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(0, 0, 0, dp(8))
      addView(card)
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private fun setPulsing(on: Boolean) {
    if (!on) {
      pulse?.cancel()
      pulse = null
      head.scaleX = 1f
      head.scaleY = 1f
      return
    }
    if (pulse != null) return
    pulse = ObjectAnimator.ofPropertyValuesHolder(
      head,
      android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.12f),
      android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.12f),
    ).apply {
      duration = 600
      repeatCount = ValueAnimator.INFINITE
      repeatMode = ValueAnimator.REVERSE
      start()
    }
  }

  private fun snapToEdge() {
    val screenWidth = context.resources.displayMetrics.widthPixels
    val headWidth = dp(HEAD_DP + 12)
    val targetX = if (params.x + headWidth / 2 < screenWidth / 2) 0 else screenWidth - headWidth
    ValueAnimator.ofInt(params.x, targetX).apply {
      duration = 220
      interpolator = DecelerateInterpolator()
      addUpdateListener {
        if (!attached) return@addUpdateListener
        params.x = it.animatedValue as Int
        windowManager.updateViewLayout(root, params)
      }
      start()
    }
  }

  private fun dp(value: Int): Int = (value * density).toInt()

  private fun roundRect(bgColor: Int, cornerRadiusPx: Float, strokeWidthPx: Int = 0, strokeColor: Int = 0): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      setColor(bgColor)
      cornerRadius = cornerRadiusPx
      if (strokeWidthPx > 0) {
        setStroke(strokeWidthPx, strokeColor)
      }
    }
  }

  private fun circle(bgColor: Int, strokeWidthPx: Int = 0, strokeColor: Int = 0): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(bgColor)
      if (strokeWidthPx > 0) {
        setStroke(strokeWidthPx, strokeColor)
      }
    }
  }

  // ─── Touch & Drag ───────────────────────────────────────────────────

  private inner class DragListener : View.OnTouchListener {
    private var startX = 0
    private var startY = 0
    private var touchX = 0f
    private var touchY = 0f
    private var dragging = false

    override fun onTouch(view: View, event: MotionEvent): Boolean {
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          startX = params.x
          startY = params.y
          touchX = event.rawX
          touchY = event.rawY
          dragging = false
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - touchX
          val dy = event.rawY - touchY
          if (!dragging && (abs(dx) > touchSlop || abs(dy) > touchSlop)) {
            dragging = true
          }
          if (dragging) {
            params.x = startX + dx.toInt()
            params.y = (startY + dy.toInt()).coerceAtLeast(0)
            windowManager.updateViewLayout(root, params)
          }
        }
        MotionEvent.ACTION_UP -> {
          if (dragging) {
            if (!isExpanded) snapToEdge()
          } else {
            // Tap on bubble: toggle floating list instead of immediately opening app
            toggleExpanded()
          }
        }
      }
      return true
    }
  }
}
